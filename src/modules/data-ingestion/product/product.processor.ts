import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import {
    KeyValuePairInput,
    MetadataInput,
    MetaimageInput,
    ProductInput,
    ProductVariantInput,
    UpsertVariantsInput,
} from '../../../graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import * as _ from 'lodash';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { NobleService } from '../../noble/noble.service';
import { ProductConsumerTaskData, ProductTriggerTaskData } from '../../noble/noble.task.data';
import { NobleTaskEntity } from '../../noble/noble.task.entity';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { RetailerService } from '../../retailer/retailer.service';
import { BulkOperationService } from '../bulk.operation.service';
import { BulkOperationType } from '../bulk.operation.type';
import { CollectionJobService } from '../collection/collection.job.service';
import axios from 'axios';
import { addSeconds } from 'date-fns';
import { createWriteStream, promises as fsPromises } from 'fs';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

@Injectable()
export class ProductProcessor implements OnApplicationBootstrap {
    constructor(
        private readonly bulkOperationService: BulkOperationService,
        private readonly nobleService: NobleService,
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly collectionJobService: CollectionJobService,
    ) {}

    async onApplicationBootstrap() {
        await this.nobleService.registerQueue({
            name: 'Sync Products Trigger',
            noTasksDelay: 1000,
            taskType: NobleTaskType.SyncProductsTrigger,
            limitOnePerStore: true,
            taskDelay: 1000,
            retries: 5,
            concurrency: 2,
            processor: task => this.syncProductsTriggerProcessor(task),
        });

        await this.nobleService.registerQueue({
            name: 'Sync Products Consumer',
            noTasksDelay: 1000,
            taskType: NobleTaskType.SyncProducts,
            limitOnePerStore: true,
            taskDelay: 1000,
            retries: 5,
            concurrency: 1,
            processor: task => this.syncProductsConsumerProcessor(task),
        });
    }

    private async buildProductTriggerQueryPayload(retailer: RetailerEntity, explicitIds: string[]): Promise<string> {
        const withPublicationStatus = await retailer.supportsWithPublicationStatus();
        let queryString = '';

        if (explicitIds.length !== 0) {
            //we want to build an explicit query string
            queryString = explicitIds
                .map(productId => {
                    let id = productId;
                    if (id.includes('gid://shopify/Product/')) {
                        id = id.replace('gid://shopify/Product/', '');
                    }
                    return `(id:${id})`;
                })
                .join(` OR `);

            queryString = `(first: ${explicitIds.length}, query: \"${queryString}\")`;
        }

        return `{
              products${queryString} {
                edges {
                  node {
                    id
                    featuredImage {
                      url
                      id
                    }
                    images {
                      edges {
                        node {
                          id
                          url
                        }
                      }
                    }
                    status
                    ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
                    storefrontId
                    title
                    descriptionHtml
                    handle
                    productType
                    tags
                    vendor
                    totalVariants
                    updatedAt
                    metafields {
                      edges {
                        node {
                          id
                          namespace
                          key
                          value
                          description
                          createdAt
                          updatedAt
                        }
                      }
                    }
                    variants {
                      edges {
                        node {
                          id
                          title
                          image {
                            id
                            url
                          }
                          price
                          sku
                          compareAtPrice
                          availableForSale
                          sellableOnlineQuantity
                          selectedOptions {
                            name
                            value
                          }
                        }
                      }
                    }
                  }
                }
              }
            }`;
    }

    async syncProductsTriggerProcessor(task: NobleTaskEntity) {
        const taskData = task.data as ProductTriggerTaskData;

        if (!task.organisationId) {
            throw new Error('Product Trigger Task missing organisation ID');
        }

        const retailer = await this.retailerService.getById(task.organisationId);
        if (!retailer) {
            throw new Error(`Retailer does not exist for id "${task.organisationId}"`);
        }

        const currentBulkOperation = await this.bulkOperationService.checkForRunningBulkOperationByRetailer(
            retailer,
            (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
        );

        if (currentBulkOperation) {
            await this.nobleService.addTimedLogMessage(
                task,
                `Shopify is already running a bulk operation for this store. ${JSON.stringify(currentBulkOperation)}`,
                true,
            );

            if (currentBulkOperation.status === BulkOperationStatus.Running) {
                //if an existing bulk operation is running, we simply reschedule this one
                await this.nobleService.rescheduleTask(task, addSeconds(new Date(), 120));
                return;
            }
            //in v2 we had a massive check here to cancel a bulk operation... but I don't think the logic makes any sense... so not porting to v3.
        }

        //There was no existing bulk operation running on shopify, so we can make one.
        const queryPayload = await this.buildProductTriggerQueryPayload(retailer, taskData.productIds);
        await this.bulkOperationService.requestBulkOperation(
            retailer,
            BulkOperationType.ProductSync,
            taskData.productIds,
            queryPayload,
            taskData.installSync,
            (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
        );
    }

    async syncProductsConsumerProcessor(task: NobleTaskEntity) {
        const taskData = task.data as ProductConsumerTaskData;

        const handleComplete = async (retailer?: RetailerEntity) => {
            if (retailer) {
                await this.retailerService.updateLastProductSyncTime(retailer);
                await this.collectionJobService.scheduleTriggerJob(retailer, [], true);
            }
            await this.nobleService.addTimedLogMessage(task, `Handle Complete`);
        };

        const bulkOperationRecord = await this.bulkOperationService.getOneByThirdPartyId(
            taskData.remoteBulkOperationId,
        );

        if (!bulkOperationRecord) {
            throw new Error(`No record found for bulk operation "${taskData.remoteBulkOperationId}"`);
            //handle complete?
        }

        await this.nobleService.addTimedLogMessage(
            task,
            `Consuming products for bulk operation: ${JSON.stringify(bulkOperationRecord)}`,
        );

        const retailer = await this.retailerService.getByDomain(bulkOperationRecord.domain);
        if (!retailer) {
            throw new Error(`Retailer for bulk operation no longer exists. ${JSON.stringify(bulkOperationRecord)}`);
        }

        if (!bulkOperationRecord.dataUrl || bulkOperationRecord.status !== BulkOperationStatus.Completed) {
            await this.nobleService.addTimedLogMessage(
                task,
                `Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`,
            );
            await handleComplete(retailer);
            //if shopify didn't return any data... there is nothing we can do here
            return;
        }

        const tempFileId = ulid();
        const tempFile = `/tmp/${tempFileId}.jsonl`;
        await this.nobleService.addTimedLogMessage(
            task,
            `Downloading data url: ${bulkOperationRecord.dataUrl} to ${tempFile}`,
        );

        const writer = createWriteStream(tempFile);
        await axios.get(bulkOperationRecord.dataUrl, { responseType: 'stream' }).then(response => {
            response.data.pipe(writer);
            return finished(writer);
        });

        await this.nobleService.addTimedLogMessage(task, `Data file downloaded`);
        const productIdToExplicitlyCheck = bulkOperationRecord.explicitIds ?? [];

        if (productIdToExplicitlyCheck.length > 0) {
            await this.nobleService.addTimedLogMessage(
                task,
                `Explicit Update the following products: ${JSON.stringify(productIdToExplicitlyCheck)}`,
            );
        } else {
            await this.nobleService.addTimedLogMessage(task, `Full product update`);
        }
        const chunkSize = 1000;
        await this.nobleService.addTimedLogMessage(task, `Reading data file in chunks of ${chunkSize}`);

        const productInputs: ProductInput[] = [];
        const allProductShopifyIdsFromThisFile: string[] = [];
        const productIdsToExplicitlyEnsureDeleted: string[] = [];
        const variantInputs: UpsertVariantsInput[] = [];

        for await (const productsInJsonLChunk of JsonLUtils.readJsonlChunked(tempFile, chunkSize)) {
            await this.nobleService.addTimedLogMessage(task, `--- Chunk Started ---`);

            const shopifyIdsForThisChunk = productsInJsonLChunk.map((p: any) => p.id);
            allProductShopifyIdsFromThisFile.push(...allProductShopifyIdsFromThisFile);
            await this.nobleService.addTimedLogMessage(task, `Ids in Chunk: ${JSON.stringify(shopifyIdsForThisChunk)}`);

            //
            for (const productInJsonL of productsInJsonLChunk) {
                const product = productInJsonL as any;
                const productId = GlobalIDUtils.gidConverter(product.id, 'ShopifyProduct')!;

                if (product.status.toLowerCase() !== 'active' || !product.publishedOnCurrentPublication) {
                    await this.nobleService.addTimedLogMessage(
                        task,
                        `Product is inactive or not published. Skipping. Prod: ${product.handle}, status: ${product.status}, publishedOnCurrentPublication: ${product.publishedOnCurrentPublication}`,
                    );

                    productIdsToExplicitlyEnsureDeleted.push(productId);
                    continue;
                }

                //Map over shopify product metafields, and create cloudshelf metadata
                const metadata: MetadataInput[] = [];
                (product.Metafield ?? []).map((metafield: any) => {
                    const metafieldInput: MetadataInput = {
                        id: GlobalIDUtils.gidConverter(metafield.id, 'ShopifyMetafield'),
                        key: `${metafield.namespace}-${metafield.key}`,
                        data: metafield.value,
                    };

                    metadata.push(metafieldInput);
                });

                //convert shopify product data to cloudshelf product data
                const productInput: ProductInput = {
                    id: productId!,
                    displayName: product.title,
                    description: product.descriptionHtml,
                    vendor: product.vendor,
                    tags: product.tags,
                    productType: product.productType,
                    metadata: metadata,
                };
                productInputs.push(productInput);

                //convert shopify product variants to cloudshelf product variants
                (product.ProductVariant ?? []).map((variant: any, variantIndex: number) => {
                    const attributes: KeyValuePairInput[] = [];
                    (variant.selectedOptions ?? []).map((opt: any) => {
                        attributes.push({
                            key: opt.name,
                            value: opt.value,
                        });
                    });

                    const metaimages: MetaimageInput[] = [];
                    if (variantIndex === 0) {
                        // We only support images on variants, while shopify supports them on product as well as the variant
                        // we handle this by allowing an image to be marked as the preferred image, which means it will be the
                        // image used for the product before a variant is selected
                        if (product.featuredImage) {
                            metaimages.push({
                                url: product.featuredImage.url,
                                preferredImage: true,
                            });
                        }

                        (product.ProductImage ?? []).map((image: any) => {
                            //check if metaimages already has this image, if so, don't add it again
                            if (metaimages.some(m => m.url === image.url)) {
                                return;
                            }

                            metaimages.push({
                                url: image.url,
                                preferredImage: false,
                            });
                        });
                    }

                    if (variant.image) {
                        if (!metaimages.some(m => m.url === variant.image.url)) {
                            metaimages.push({
                                url: variant.image.url,
                                preferredImage: false,
                            });
                        }
                    }

                    const currentPrice = parseFloat(variant.price);
                    let originalPrice = currentPrice;

                    if (variant.compareAtPrice !== undefined) {
                        const compareAtPrice = parseFloat(variant.compareAtPrice);
                        originalPrice = compareAtPrice;

                        if (compareAtPrice < currentPrice) {
                            originalPrice = currentPrice;
                        }

                    const ProductVariantInput: ProductVariantInput = {
                        id: GlobalIDUtils.gidConverter(variant.id, 'ShopifyProductVariant'),
                        displayName: variant.title,
                        currentPrice: currentPrice,
                        originalPrice: originalPrice,
                        sku: variant.sku ?? '',
                        //We only support in stock / out of stock not stock count in v3
                        isInStock: variant.sellableOnlineQuantity > 0,
                        attributes: attributes,
                        availableToPurchase: variant.availableForSale,
                        metaimages: metaimages,
                        //We don't yet support variant metadata
                        metadata: [],
                    };

                    const existingVariantInput = variantInputs.find(v => v.productId === productId);
                    if (existingVariantInput) {
                        existingVariantInput.variants.push(ProductVariantInput);
                    } else {
                        variantInputs.push({
                            productId: productId,
                            variants: [ProductVariantInput],
                        });
                    }
                });
            }

            await this.nobleService.addTimedLogMessage(
                task,
                'Upserting products to cloudshelf for current file chunk, in chunks of 250',
            );

            //split into chunks of 250
            const chunkedProductInputs = _.chunk(productInputs, 250);
            for (const chunk of chunkedProductInputs) {
                await this.nobleService.addTimedLogMessage(
                    task,
                    `Upserting ${chunk.length} products to cloudshelf for current file chunk`,
                );
                await this.cloudshelfApiService.upsertProducts(bulkOperationRecord.domain, chunk);
            }

            await this.nobleService.addTimedLogMessage(
                task,
                'Upserting variants to cloudshelf for current file chunk, in chunks of 250',
            );

            const chunkedVariantInputs = _.chunk(variantInputs, 250);
            for (const variantInput of chunkedVariantInputs) {
                await this.nobleService.addTimedLogMessage(
                    task,
                    `Upserting ${variantInput.length} variants to cloudshelf for current file chunk`,
                );
                await this.cloudshelfApiService.upsertProductVariants(bulkOperationRecord.domain, variantInput);
            }
            await this.nobleService.addTimedLogMessage(task, '--- Chunk finished ---');
        }

        //todo: delete products that are not in the file
        if ((bulkOperationRecord.explicitIds ?? []).length === 0) {
            //this was a full sync, so we can delete all ids we did not see
            //deleteAllExcept
        } else {
            //this was a partial sync, so we need to delete all ids that we did not see

            const productIdsWeShouldHaveSeen = bulkOperationRecord.explicitIds;
            const productIdsWeDidNotSee = productIdsWeShouldHaveSeen.filter(
                p => !allProductShopifyIdsFromThisFile.includes(p),
            );

            // deleteByIds
        }

        await this.nobleService.addTimedLogMessage(task, `Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);

        await handleComplete(retailer);
    }
}

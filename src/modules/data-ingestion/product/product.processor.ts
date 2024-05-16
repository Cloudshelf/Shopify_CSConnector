import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { S3Utils } from '../../../utils/S3Utils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { cloudflareSchema } from '../../configuration/schemas/cloudflare.schema';
import { NobleService } from '../../noble/noble.service';
import { ProductConsumerTaskData, ProductTriggerTaskData } from '../../noble/noble.task.data';
import { NobleTaskEntity } from '../../noble/noble.task.entity';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { RetailerService } from '../../retailer/retailer.service';
import { ToolsService } from '../../tools/tools.service';
import { BulkOperationService } from '../bulk.operation.service';
import { BulkOperationType } from '../bulk.operation.type';
import { CollectionJobService } from '../collection/collection.job.service';
import axios from 'axios';
import { addSeconds, subDays, subMinutes } from 'date-fns';
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
        private readonly cloudflareConfigService: ConfigService<typeof cloudflareSchema>,
        private readonly toolsService: ToolsService,
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

    private async buildProductTriggerQueryPayload(retailer: RetailerEntity, changesSince?: Date): Promise<string> {
        const withPublicationStatus = await retailer.supportsWithPublicationStatus();
        let queryString = '';

        if (changesSince !== undefined) {
            //we want to build an explicit query string
            queryString = `updated_at:>'${changesSince.toISOString()}'`;

            queryString = `(query: \"${queryString}\")`;
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
                          barcode
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

        retailer.syncErrorCode = null;

        if (task.data?.installSync) {
            // If it's a daily sync, we should check we have all the webhooks for this retailer
            await this.toolsService.registerAllWebhooksForRetailer(retailer);
        }

        const currentBulkOperation = await this.bulkOperationService.checkForRunningBulkOperationByRetailer(
            retailer,
            (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
        );

        if (currentBulkOperation) {
            if (currentBulkOperation.status === BulkOperationStatus.Running) {
                await this.nobleService.addTimedLogMessage(
                    task,
                    `Shopify is already running a bulk operation for this store. ${JSON.stringify(
                        currentBulkOperation,
                    )}`,
                    true,
                );
                //if an existing bulk operation is running, we simply reschedule this one
                await this.nobleService.rescheduleTask(task, addSeconds(new Date(), 120));
                return;
            }
            //in v2 we had a massive check here to cancel a bulk operation... but I don't think the logic makes any sense... so not porting to v3.
        }

        //There was no existing bulk operation running on shopify, so we can make one.

        let changesSince: Date | undefined = undefined;
        if (!taskData.installSync) {
            changesSince = retailer.nextPartialSyncRequestTime ?? undefined;

            if (changesSince === undefined) {
                //If we have never don't a partial sync, lets just get the last days worth of changes...
                //This is just so we get something.
                changesSince = subDays(new Date(), 1);
            }

            retailer.lastPartialSyncRequestTime = changesSince;
        }

        const queryPayload = await this.buildProductTriggerQueryPayload(retailer, changesSince);
        await this.bulkOperationService.requestBulkOperation(
            retailer,
            BulkOperationType.ProductSync,
            queryPayload,
            taskData.installSync,
            (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
        );

        //After the bulk operation is requested, we can update the lastPartialSyncRequestTime, so that next time we know what time to use
        // retailer.lastPartialSyncRequestTime = subMinutes(new Date(), 1);
        retailer.nextPartialSyncRequestTime = subMinutes(new Date(), 1);
    }

    async syncProductsConsumerProcessor(task: NobleTaskEntity) {
        const taskData = task.data as ProductConsumerTaskData;

        const handleComplete = async (msg: string, retailer?: RetailerEntity) => {
            if (retailer) {
                await this.retailerService.updateLastProductSyncTime(retailer);
                await this.collectionJobService.scheduleTriggerJob(retailer, taskData.installSync);
            }
            await this.nobleService.addTimedLogMessage(task, `Handle Complete: ${msg}`, true);
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
            true,
        );

        const retailer = await this.retailerService.getByDomain(bulkOperationRecord.domain);
        if (!retailer) {
            throw new Error(`Retailer for bulk operation no longer exists. ${JSON.stringify(bulkOperationRecord)}`);
        }

        retailer.syncErrorCode = null;

        if (!bulkOperationRecord.dataUrl || bulkOperationRecord.status !== BulkOperationStatus.Completed) {
            await this.nobleService.addTimedLogMessage(
                task,
                `Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`,
            );
            await handleComplete(`No Data URL, or shopify job failed. Status: ${bulkOperationRecord.status}`, retailer);
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

        const runFullSyncLogic = taskData.installSync;
        if (runFullSyncLogic) {
            await this.nobleService.addTimedLogMessage(task, `Full product update`);
        } else {
            await this.nobleService.addTimedLogMessage(task, `Partial product update`);
        }

        const chunkSize = 1000;
        await this.nobleService.addTimedLogMessage(task, `Reading data file in chunks of ${chunkSize}`);

        const productInputs: ProductInput[] = [];
        const allProductShopifyIdsFromThisFile: string[] = [];
        const allVariantShopifyIdsFromThisFile: string[] = [];
        const productIdsToExplicitlyEnsureDeleted: string[] = [];
        const variantInputs: UpsertVariantsInput[] = [];
        let imageCount = 0;

        for await (const productsInJsonLChunk of JsonLUtils.readJsonlChunked(tempFile, chunkSize)) {
            await this.nobleService.addTimedLogMessage(task, `--- Chunk Started ---`);

            for (const productInJsonL of productsInJsonLChunk) {
                const product = productInJsonL as any;
                const productId = GlobalIDUtils.gidConverter(product.id, 'ShopifyProduct')!;
                allProductShopifyIdsFromThisFile.push(productId);

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
                    handle: product.handle,
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

                    if (variant.compareAtPrice !== undefined && variant.compareAtPrice !== null) {
                        const compareAtPrice = parseFloat(variant.compareAtPrice);
                        originalPrice = compareAtPrice;

                        if (compareAtPrice < currentPrice) {
                            originalPrice = currentPrice;
                        }
                    }

                    const ProductVariantInput: ProductVariantInput = {
                        id: GlobalIDUtils.gidConverter(variant.id, 'ShopifyProductVariant'),
                        position: variantIndex,
                        displayName: variant.title,
                        currentPrice: currentPrice,
                        originalPrice: originalPrice,
                        sku: variant.sku ?? '',
                        barcode: variant.barcode ?? '',
                        //We only support in stock / out of stock not stock count in v3
                        isInStock: variant.sellableOnlineQuantity > 0,
                        attributes: attributes,
                        availableToPurchase: variant.availableForSale,
                        metaimages: metaimages,
                        //We don't yet support variant metadata
                        metadata: [],
                    };

                    imageCount += metaimages.length;
                    allVariantShopifyIdsFromThisFile.push(ProductVariantInput.id);

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

            await this.nobleService.addTimedLogMessage(task, '--- Chunk finished ---');
        }

        await this.nobleService.addTimedLogMessage(
            task,
            `Upserting ${productInputs.length} products to cloudshelf for current file, in chunks of 250`,
            true,
        );

        //split into chunks of 250
        const chunkedProductInputs = _.chunk(productInputs, 250);
        for (const chunk of chunkedProductInputs) {
            await this.nobleService.addTimedLogMessage(
                task,
                `Upserting ${chunk.length} products to cloudshelf for current file`,
            );
            await this.cloudshelfApiService.upsertProducts(bulkOperationRecord.domain, chunk);
        }

        await this.nobleService.addTimedLogMessage(
            task,
            `Upserting variants for ${variantInputs.length} products to cloudshelf for current file, in chunks of 250`,
        );

        const chunkedVariantInputs = _.chunk(variantInputs, 250);
        for (const variantInput of chunkedVariantInputs) {
            await this.nobleService.addTimedLogMessage(
                task,
                `Upserting ${variantInput.length} variants to cloudshelf for current file`,
            );
            await this.cloudshelfApiService.upsertProductVariants(bulkOperationRecord.domain, variantInput);
        }

        console.log('allProductShopifyIdsFromThisFile', allProductShopifyIdsFromThisFile);
        if (runFullSyncLogic) {
            //For a full sync, we know we should have seen all the ids, so we can call the keepKnownProductsViaFile mutation, which will delete any products that were not in the file
            const productContentToSave: { id: string }[] = [];

            //all the IDS that exist in allProductShopifyIdsFromThisFile and do not exist in productIdsToExplicitlyEnsureDeleted should added to contentToSave
            for (const id of allProductShopifyIdsFromThisFile) {
                if (!productIdsToExplicitlyEnsureDeleted.includes(id)) {
                    productContentToSave.push({ id: id });
                }
            }

            const productFileName = `${process.env.RELEASE_TYPE}_${retailer.domain}_products_${ulid()}.json`;
            let productUrl = `${this.cloudflareConfigService.get<string>('CLOUDFLARE_R2_PUBLIC_ENDPOINT')}`;
            if (!productUrl.endsWith('/')) {
                productUrl += '/';
            }
            productUrl += `${productFileName}`;
            const fileContent = JSON.stringify(productContentToSave);
            const didProductFileUpload = await S3Utils.UploadJsonFile(
                fileContent,
                'product-deletion-payloads',
                productFileName,
            );

            await this.nobleService.addTimedLogMessage(task, `Product deletion file uploaded: ${fileContent}`);

            if (didProductFileUpload) {
                await this.cloudshelfApiService.keepKnownProductsViaFile(retailer.domain, productUrl);
            }

            const variantContentToSave: { id: string }[] = [];

            for (const id of allVariantShopifyIdsFromThisFile) {
                variantContentToSave.push({ id: id });
            }

            const variantFileName = `${process.env.RELEASE_TYPE}_${retailer.domain}_variants_${ulid()}.json`;
            let variantUrl = `${this.cloudflareConfigService.get<string>('CLOUDFLARE_R2_PUBLIC_ENDPOINT')}`;
            if (!variantUrl.endsWith('/')) {
                variantUrl += '/';
            }
            variantUrl += `${variantFileName}`;

            const didVariantFileUpload = await S3Utils.UploadJsonFile(
                JSON.stringify(variantContentToSave),
                'product-deletion-payloads',
                variantFileName,
            );

            if (didVariantFileUpload) {
                await this.cloudshelfApiService.keepKnownVariantsViaFile(retailer.domain, variantUrl);
            }
        }

        await this.nobleService.addTimedLogMessage(task, `Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);

        if (runFullSyncLogic) {
            const sumOfVariants = variantInputs.reduce((acc, val) => acc + val.variants.length, 0);
            const input = {
                knownNumberOfProductGroups: undefined,
                knownNumberOfProducts: productInputs.length,
                knownNumberOfProductVariants: sumOfVariants,
                knownNumberOfImages: imageCount,
            };
            await this.nobleService.addTimedLogMessage(
                task,
                `Reporting catalog stats to cloudshelf: ${JSON.stringify(input)}`,
            );
            await this.cloudshelfApiService.reportCatalogStats(retailer.domain, input, async logMessage => {
                await this.nobleService.addTimedLogMessage(task, logMessage);
            });
        }

        await handleComplete('job complete', retailer);
    }
}

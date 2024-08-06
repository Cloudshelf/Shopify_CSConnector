import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductGroupInput } from '../../../graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import * as _ from 'lodash';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { S3Utils } from '../../../utils/S3Utils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { cloudflareSchema } from '../../configuration/schemas/cloudflare.schema';
import { NobleService } from '../../noble/noble.service';
import { CollectionConsumerTaskData, CollectionTriggerTaskData } from '../../noble/noble.task.data';
import { NobleTaskEntity } from '../../noble/noble.task.entity';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { RetailerService } from '../../retailer/retailer.service';
import { BulkOperationService } from '../bulk.operation.service';
import { BulkOperationType } from '../bulk.operation.type';
import { ProductJobService } from '../product/product.job.service';
import axios from 'axios';
import { addSeconds } from 'date-fns';
import { createWriteStream, promises as fsPromises } from 'fs';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { inspect, promisify } from 'util';

const finished = promisify(stream.finished);
@Injectable()
export class CollectionsProcessor implements OnApplicationBootstrap {
    constructor(
        private readonly bulkOperationService: BulkOperationService,
        private readonly nobleService: NobleService,
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly cloudflareConfigService: ConfigService<typeof cloudflareSchema>,
        private readonly productJobService: ProductJobService,
    ) {}

    async onApplicationBootstrap() {
        await this.nobleService.registerQueue({
            name: 'Sync Collections Trigger',
            noTasksDelay: 1000,
            taskType: NobleTaskType.SyncCollectionsTrigger,
            limitOnePerStore: true,
            taskDelay: 1000,
            retries: 5,
            concurrency: 2,
            processor: task => this.syncCollectionsTriggerProcessor(task),
        });

        await this.nobleService.registerQueue({
            name: 'Sync Collections Consumer',
            noTasksDelay: 1000,
            taskType: NobleTaskType.SyncCollections,
            limitOnePerStore: true,
            taskDelay: 1000,
            retries: 5,
            concurrency: 1,
            processor: task => this.syncCollectionsConsumerProcessor(task),
        });
    }

    private async buildCollectionTriggerQueryPayload(retailer: RetailerEntity, changesSince?: Date): Promise<string> {
        const withPublicationStatus = await retailer.supportsWithPublicationStatus();
        let queryString = '';

        if (changesSince !== undefined) {
            //we want to build an explicit query string
            queryString = `updated_at:>'${changesSince.toISOString()}'`;

            queryString = `(query: \"${queryString}\")`;
        }

        return `{
              collections${queryString}  {
                edges {
                  node {
                    id
                    ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
                    title
                    handle
                    image {
                      url
                    }
                    storefrontId
                    updatedAt
                    products {
                      edges {
                        node {
                          id
                          featuredImage {
                                url
                                id
                          }
                        }
                      }
                    }
                  }
                }
              }
            }`;
    }

    async syncCollectionsTriggerProcessor(task: NobleTaskEntity) {
        const taskData = task.data as CollectionTriggerTaskData;

        if (!task.organisationId) {
            throw new Error('Product Trigger Task missing organisation ID');
        }

        const retailer = await this.retailerService.getById(task.organisationId);
        if (!retailer) {
            throw new Error(`Retailer does not exist for id "${task.organisationId}"`);
        }

        retailer.syncErrorCode = null;

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
            //We don't need to do anything special here, as the time was
            changesSince = retailer.lastPartialSyncRequestTime ?? undefined;
        }

        const queryPayload = await this.buildCollectionTriggerQueryPayload(retailer, changesSince);
        await this.bulkOperationService.requestBulkOperation(
            retailer,
            BulkOperationType.ProductGroupSync,
            queryPayload,
            taskData.installSync,
            (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
        );
    }

    async syncCollectionsConsumerProcessor(task: NobleTaskEntity) {
        const taskData = task.data as CollectionConsumerTaskData;

        const handleComplete = async (retailer?: RetailerEntity) => {
            if (retailer) {
                await this.retailerService.updateLastProductGroupSyncTime(retailer);

                if (task.data?.installSync) {
                    await this.retailerService.updateLastSafetyCompletedTime(retailer);
                }
                // await this.collectionJobService.scheduleTriggerJob(retailer, [], true);

                await this.productJobService.scheduleTriggerJob(retailer, false);
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
            `Consuming collections for bulk operation: ${JSON.stringify(bulkOperationRecord)}`,
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

        const runFullSyncLogic = taskData.installSync;
        if (runFullSyncLogic) {
            await this.nobleService.addTimedLogMessage(task, `Full collection update`);
        } else {
            await this.nobleService.addTimedLogMessage(task, `Partial collection update`);
        }

        await this.nobleService.addTimedLogMessage(task, `Reading data file`);

        const productGroupInputs: ProductGroupInput[] = [];
        const allProductGroupShopifyIdsFromThisFile: string[] = [];
        const productsInGroups: { [productGroupId: string]: string[] } = {};
        const productGroupIdsToExplicitlyEnsureDeleted: string[] = [];

        for await (const collectionObj of JsonLUtils.readJsonl(tempFile)) {
            const collectionId = GlobalIDUtils.gidConverter(collectionObj.id, 'ShopifyCollection')!;
            allProductGroupShopifyIdsFromThisFile.push(collectionId);

            if (!collectionObj.publishedOnCurrentPublication) {
                await this.nobleService.addTimedLogMessage(
                    task,
                    `Skipping collection ${collectionId} as it is not published on current publication`,
                );
                productGroupIdsToExplicitlyEnsureDeleted.push(collectionId);
                continue;
            }

            let image: string | undefined = undefined;

            if (collectionObj.image?.url) {
                image = collectionObj.image.url;
            }

            (collectionObj.Product ?? []).map((p: any) => {
                const productId = GlobalIDUtils.gidConverter(p.id, 'ShopifyProduct')!;

                if (p.featuredImage?.url) {
                    if (image === undefined || image === '') {
                        image = p.featuredImage.url;
                    }
                }

                if (productsInGroups[collectionId] === undefined) {
                    productsInGroups[collectionId] = [productId];
                } else {
                    productsInGroups[collectionId].push(productId);
                }
            });

            const productGroupInput: ProductGroupInput = {
                id: collectionId,
                displayName: collectionObj.title,
                // this should be metaimages?
                featuredImage: image
                    ? {
                          url: image,
                          preferredImage: false,
                      }
                    : null,
                //We dont yet support metadata on collections
                metadata: [],
            };
            productGroupInputs.push(productGroupInput);
        }

        await this.nobleService.addTimedLogMessage(
            task,
            `Upserting collections to cloudshelf: ${JSON.stringify(productGroupInputs)}`,
        );

        await this.cloudshelfApiService.updateProductGroups(
            retailer.domain,
            productGroupInputs,
            async (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
        );

        await this.nobleService.addTimedLogMessage(task, `Updating products in collections on cloudshelf`);
        for (const [productGroupId, productIds] of Object.entries(productsInGroups)) {
            const reversedProductIds = productIds.slice().reverse();

            this.nobleService.addTimedLogMessage(
                task,
                `Product Group: ${productGroupId}, products: ${inspect(reversedProductIds)}`,
            );
            await this.cloudshelfApiService.updateProductsInProductGroup(
                retailer.domain,
                productGroupId,
                reversedProductIds,
                async (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
            );
        }

        await this.nobleService.addTimedLogMessage(task, `Finished reporting all products in all groups`);

        await this.cloudshelfApiService.createFirstCloudshelfIfRequired(retailer);

        if (runFullSyncLogic) {
            const groupContentToSave: { id: string }[] = [];

            for (const id of allProductGroupShopifyIdsFromThisFile) {
                if (!productGroupIdsToExplicitlyEnsureDeleted.includes(id)) {
                    groupContentToSave.push({ id });
                }
            }

            const groupFileName = `${process.env.RELEASE_TYPE}_${retailer.domain}_product_groups_${ulid()}.json`;
            let groupUrl = `${this.cloudflareConfigService.get<string>('CLOUDFLARE_R2_PUBLIC_ENDPOINT')}`;
            if (!groupUrl.endsWith('/')) {
                groupUrl += '/';
            }
            groupUrl += `${groupFileName}`;

            const didGroupFileUpload = await S3Utils.UploadJsonFile(
                JSON.stringify(groupContentToSave),
                'product-deletion-payloads',
                groupFileName,
            );

            if (didGroupFileUpload) {
                await this.nobleService.addTimedLogMessage(task, `Starting delete product groups via file`, true);
                await this.cloudshelfApiService.keepKnownProductGroupsViaFile(retailer.domain, groupUrl);
                await this.nobleService.addTimedLogMessage(task, `Finished delete product groups via file`, true);
            }
        }

        await this.nobleService.addTimedLogMessage(task, `Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);

        if (runFullSyncLogic) {
            const input = {
                knownNumberOfProductGroups: productGroupInputs.length,
                knownNumberOfProducts: undefined,
                knownNumberOfProductVariants: undefined,
                knownNumberOfImages: undefined,
            };
            await this.nobleService.addTimedLogMessage(
                task,
                `Reporting catalog stats to cloudshelf: ${JSON.stringify(input)}`,
            );

            await this.cloudshelfApiService.reportCatalogStats(retailer.domain, input, async logMessage => {
                await this.nobleService.addTimedLogMessage(task, logMessage);
            });
        }
        await handleComplete(retailer);
    }
}

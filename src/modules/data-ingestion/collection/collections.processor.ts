import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ProductGroupInput } from '../../../graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import * as _ from 'lodash';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { NobleService } from '../../noble/noble.service';
import { CollectionConsumerTaskData, CollectionTriggerTaskData } from '../../noble/noble.task.data';
import { NobleTaskEntity } from '../../noble/noble.task.entity';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { RetailerService } from '../../retailer/retailer.service';
import { BulkOperationService } from '../bulk.operation.service';
import { BulkOperationType } from '../bulk.operation.type';
import { WebhookQueuedDataActionType } from '../webhook.queued.data.action.type';
import { WebhookQueuedDataContentType } from '../webhook.queued.data.content.type';
import { WebhookQueuedData } from '../webhook.queued.data.entity';
import { WebhookQueuedService } from '../webhook.queued.service';
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
        private readonly webhookQueuedService: WebhookQueuedService,
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

    private async buildCollectionTriggerQueryPayload(retailer: RetailerEntity, explicitIds: string[]): Promise<string> {
        const withPublicationStatus = await retailer.supportsWithPublicationStatus();
        let queryString = '';

        if (explicitIds.length !== 0) {
            //we want to build an explicit query string
            queryString = explicitIds
                .map(collectionId => {
                    let id = collectionId;
                    if (id.includes('gid://shopify/Collection/')) {
                        id = id.replace('gid://shopify/Collection/', '');
                    }
                    return `(id:${id})`;
                })
                .join(` OR `);

            queryString = `(first: ${explicitIds.length}, query: \"${queryString}\")`;
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

        let collectionIds: string[] = [];
        let queuedWebhooks: WebhookQueuedData[] = [];
        if (!taskData.installSync) {
            queuedWebhooks = await this.webhookQueuedService.getAllByDomainAndTypeAndAction(
                retailer.domain,
                WebhookQueuedDataContentType.COLLECTION,
                WebhookQueuedDataActionType.UPDATE,
            );
            collectionIds = _.uniq(queuedWebhooks.map(w => w.content));
        }

        //There was no existing bulk operation running on shopify, so we can make one.
        const queryPayload = await this.buildCollectionTriggerQueryPayload(retailer, collectionIds);
        await this.bulkOperationService.requestBulkOperation(
            retailer,
            BulkOperationType.ProductGroupSync,
            collectionIds,
            queryPayload,
            taskData.installSync,
            (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
        );

        if (queuedWebhooks.length > 0) {
            await this.webhookQueuedService.delete(queuedWebhooks);
        }
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

        const productGroupIdToExplicitlyCheck = bulkOperationRecord.explicitIds ?? [];

        if (productGroupIdToExplicitlyCheck.length > 0) {
            await this.nobleService.addTimedLogMessage(
                task,
                `Explicit Update the following collections: ${JSON.stringify(productGroupIdToExplicitlyCheck)}`,
            );
        } else {
            await this.nobleService.addTimedLogMessage(task, `Full collection update`);
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
            this.nobleService.addTimedLogMessage(
                task,
                `Product Group: ${productGroupId}, products: ${inspect(productIds)}`,
            );
            await this.cloudshelfApiService.updateProductsInProductGroup(
                retailer.domain,
                productGroupId,
                productIds,
                async (logMessage: string) => this.nobleService.addTimedLogMessage(task, logMessage),
            );
        }

        await this.nobleService.addTimedLogMessage(task, `Finished reporting all products in all groups`);

        await this.cloudshelfApiService.createFirstCloudshelfIfRequired(retailer);

        //todo: delete delete groups that are not in the file
        if ((bulkOperationRecord.explicitIds ?? []).length === 0) {
            //this was a full sync, so we can delete all ids we did not see
            //deleteAllExcept
        } else {
            //this was a partial sync, so we need to delete all ids that we did not see

            const productGroupsIdsWeShouldHaveSeen = bulkOperationRecord.explicitIds;
            const productGroupIdsWeDidNotSee = productGroupsIdsWeShouldHaveSeen.filter(
                p => !allProductGroupShopifyIdsFromThisFile.includes(p),
            );

            // deleteByIds
        }

        await this.nobleService.addTimedLogMessage(task, `Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);

        const input = {
            knownNumberOfProductGroups: productGroupInputs.length,
            knownNumberOfProducts: undefined,
            knownNumberOfProductVariants: undefined,
            knownNumberOfImages: undefined,
        };
        await this.nobleService.addTimedLogMessage(
            task,
            `Reporting catalog stats to cloudshelf: ${JSON.stringify(input)}`,
            true,
        );

        await this.cloudshelfApiService.reportCatalogStats(retailer.domain, input);
        await handleComplete(retailer);
    }
}

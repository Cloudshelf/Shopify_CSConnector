import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { BulkOperationUtils } from '../../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { AppDataSource } from '../../reuseables/orm';
import { sleep } from '../../reuseables/sleep';
import { logger, task } from '@trigger.dev/sdk';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import { CollectionJobUtils } from 'src/modules/data-ingestion/collection.job.utils';
import { IngestionQueue } from 'src/trigger/queues';
import { NotificationUtils } from 'src/utils/NotificationUtils';
import { SlackUtils } from 'src/utils/SlackUtils';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

export const ProcessProductGroupsForDeletionTask = task({
    id: 'process-product-groups-for-deletion',
    queue: IngestionQueue,
    machine: { preset: `medium-1x` },
    run: async (payload: { remoteBulkOperationId: string }, { ctx }) => {
        logger.info('Payload', payload);
        const handleComplete = async (em: EntityManager, msg: string, retailer?: RetailerEntity) => {
            logger.info('handleComplete', { msg, retailer: retailer?.id ?? 'no retailer' });
            if (retailer) {
                await CollectionJobUtils.scheduleDELETETriggerJob(retailer, undefined, {
                    info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
                });
            }
            logger.info(`Handle Complete: ${msg}`);
            await em.flush();
        };
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }
        const slackToken = process.env.SLACK_TOKEN;
        if (!slackToken) {
            logger.error(`SLACK_TOKEN is not set`);
            throw new Error(`SLACK_TOKEN is not set`);
        }

        const slackChannel = process.env.SLACK_DELETE_NOTIFICATION_CHANNEL;
        if (!slackChannel) {
            logger.error(`SLACK_DELETE_NOTIFICATION_CHANNEL is not set`);
            throw new Error(`SLACK_DELETE_NOTIFICATION_CHANNEL is not set`);
        }
        const cloudshelfAPI = process.env.CLOUDSHELF_API_URL;
        if (!cloudshelfAPI) {
            logger.error(`CLOUDSHELF_API_URL is not set`);
            throw new Error(`CLOUDSHELF_API_URL is not set`);
        }
        const connectorHost = process.env.SHOPIFY_CONNECTOR_HOST;
        if (!connectorHost) {
            logger.error(`SHOPIFY_CONNECTOR_HOST is not set`);
            throw new Error(`SHOPIFY_CONNECTOR_HOST is not set`);
        }
        const cloudflarePublicEndpoint = process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
        if (!cloudflarePublicEndpoint) {
            logger.error(`CLOUDFLARE_R2_PUBLIC_ENDPOINT is not set`);
            throw new Error(`CLOUDFLARE_R2_PUBLIC_ENDPOINT is not set`);
        }
        const filePrefix = process.env.FILE_PREFIX;
        if (!filePrefix) {
            logger.error(`FILE_PREFIX is not set`);
            throw new Error(`FILE_PREFIX is not set`);
        }
        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });
        const bulkOperationRecord = await BulkOperationUtils.getOneByThirdPartyId(em, payload.remoteBulkOperationId);
        if (!bulkOperationRecord) {
            logger.error(`Bulk operation record not found for id "${payload.remoteBulkOperationId}"`);
            throw new Error(`Bulk operation record not found for id "${payload.remoteBulkOperationId}"`);
        }
        logger.info(`Consuming collections for bulk operation "${payload.remoteBulkOperationId}"`, {
            bulkOperationRecord,
        });
        const retailer = await em.findOne(RetailerEntity, { domain: bulkOperationRecord.domain });
        if (!retailer) {
            logger.error(`Retailer does not exist for domain "${bulkOperationRecord.domain}"`);
            throw new Error(`Retailer does not exist for domain "${bulkOperationRecord.domain}"`);
        }
        retailer.syncErrorCode = null;
        if (!bulkOperationRecord.dataUrl || bulkOperationRecord.status !== BulkOperationStatus.Completed) {
            logger.warn(`Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`);
            await handleComplete(
                em,
                `No Data URL, or shopify job failed. Status: ${bulkOperationRecord.status}`,
                retailer,
            );
            //if shopify didn't return any data... there is nothing we can do here
            return;
        }
        const tempFileId = ulid();
        const tempFile = `/tmp/${tempFileId}.jsonl`;
        logger.info(`Downloading data url: ${bulkOperationRecord.dataUrl} to ${tempFile}`);
        const writer = createWriteStream(tempFile);
        await axios.get(bulkOperationRecord.dataUrl, { responseType: 'stream' }).then(response => {
            response.data.pipe(writer);
            return finished(writer);
        });

        logger.info(`Reading data file`);
        const seenCollectionIds: string[] = [];
        for await (const collectionObj of JsonLUtils.readJsonl(tempFile)) {
            await sleep(1);
            const collectionId = GlobalIDUtils.gidConverter(collectionObj.id, 'ShopifyCollection')!;

            if (!seenCollectionIds.includes(collectionId)) {
                seenCollectionIds.push(collectionId);
            }
        }

        if (seenCollectionIds.length !== bulkOperationRecord.objectCount) {
            logger.error('Seen Collection ID length != Obejct Count in Bulk operation');
        } else {
            logger.log(`Seen Collection Id & Object count MATCH!`);
        }

        await SlackUtils.SendNotification(
            slackToken,
            slackChannel,
            NotificationUtils.buildDeleteTestNotifications({
                displayName: retailer.displayName ?? retailer.id,
                ourCount: seenCollectionIds.length,
                shopifyCount: bulkOperationRecord.objectCount,
            }),
        );

        logger.info(`Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);
        await handleComplete(em, 'job complete', retailer);
    },
});

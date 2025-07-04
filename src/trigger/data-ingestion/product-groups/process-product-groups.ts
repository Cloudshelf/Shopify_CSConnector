import { ProductGroupInput } from '../../../graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { CloudshelfApiUtils } from '../../../modules/cloudshelf/cloudshelf.api.util';
import { BulkOperationUtils } from '../../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { getDbForTrigger } from '../../reuseables/db';
import { logger, task } from '@trigger.dev/sdk';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import { PostSyncJobUtils } from 'src/modules/data-ingestion/sync.job.utils';
import { IngestionQueue } from 'src/trigger/queues';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

export const ProcessProductGroupsTask = task({
    id: 'process-product-groups',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
    run: async (payload: { remoteBulkOperationId: string; fullSync: boolean }, { ctx }) => {
        logger.info('Payload', payload);
        const handleComplete = async (em: EntityManager, msg: string, retailer?: RetailerEntity) => {
            logger.info('handleComplete', { msg, retailer: retailer?.id ?? 'no retailer', fullSync: payload.fullSync });
            if (retailer) {
                retailer.lastProductGroupSync = new Date();
                if (payload.fullSync) {
                    retailer.lastSafetySyncCompleted = new Date();
                }
                await PostSyncJobUtils.scheduleJob(retailer, undefined, {
                    info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
                });
            }
            logger.info(`Handle Complete: ${msg}`);
            await em.flush();
        };

        const AppDataSource = getDbForTrigger();
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
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
        if (payload.fullSync) {
            logger.info(`Full collection update`);
        } else {
            logger.info(`Partial collection update`);
        }

        logger.info(`Reading data file`);
        const productGroupInputs: ProductGroupInput[] = [];
        const productsInGroups: { [productGroupId: string]: string[] } = {};
        for await (const collectionObj of JsonLUtils.readJsonl(tempFile)) {
            const collectionId = GlobalIDUtils.gidConverter(collectionObj.id, 'ShopifyCollection')!;
            if (!collectionObj.publishedOnCurrentPublication) {
                logger.info(`Skipping collection ${collectionId} as it is not published on current publication`);
                continue;
            }
            let image: string | undefined = undefined;
            if (collectionObj.image?.url) {
                image = collectionObj.image.url;
            }
            if (collectionObj.Product) {
                for (const p of collectionObj.Product) {
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
                }
            }
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

        logger.info(`Upserting collections to cloudshelf`, { productGroupInputs });
        await CloudshelfApiUtils.updateProductGroups(cloudshelfAPI, retailer.domain, productGroupInputs, {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });

        logger.info(`Updating products in ${Object.entries(productsInGroups).length} product groups on cloudshelf`);
        for (const [productGroupId, productIds] of Object.entries(productsInGroups)) {
            const reversedProductIds = productIds.slice().reverse();
            logger.info(`Product Group: ${productGroupId}, products`, { reversedProductIds });
            await CloudshelfApiUtils.updateProductsInProductGroup(
                cloudshelfAPI,
                retailer.domain,
                productGroupId,
                reversedProductIds,
                {
                    info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
                },
            );
        }

        logger.info(`Finished reporting all products in all groups`);
        logger.info(`Creating first cloud shelf if required`);
        await CloudshelfApiUtils.createFirstCloudshelfIfRequired(cloudshelfAPI, em, retailer, {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });
        logger.info(`Deleting downloaded data file: ${tempFile}`);
        await fsPromises.unlink(tempFile);
        if (payload.fullSync) {
            const input = {
                knownNumberOfProductGroups: productGroupInputs.length,
                knownNumberOfProducts: undefined,
                knownNumberOfProductVariants: undefined,
                knownNumberOfImages: undefined,
            };
            logger.info(`Reporting catalog stats to cloudshelf.`, { input });
            await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
        }
        await handleComplete(em, 'job complete', retailer);
    },
});

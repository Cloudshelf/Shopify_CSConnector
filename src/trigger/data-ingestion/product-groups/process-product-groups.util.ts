import * as joi from 'joi';
import { ProductGroupInput, ProductGroupUpdateBatchItem } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/postgresql';
import { logger } from '@trigger.dev/sdk';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { BulkOperationUtils } from 'src/modules/data-ingestion/bulk.operation.utils';
import { PostSyncJobUtils } from 'src/modules/data-ingestion/sync.job.utils';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { JsonLUtils } from 'src/utils/JsonLUtils';
import { finished } from 'stream/promises';
import { ulid } from 'ulid';

const schema = joi.object({
    CLOUDSHELF_API_URL: joi.string().required().uri().label('CLOUDSHELF_API_URL'),
    SHOPIFY_CONNECTOR_HOST: joi.string().required().uri().label('SHOPIFY_CONNECTOR_HOST'),
    CLOUDFLARE_R2_PUBLIC_ENDPOINT: joi.string().required().uri().label('CLOUDFLARE_R2_PUBLIC_ENDPOINT'),
    FILE_PREFIX: joi.string().required().label('FILE_PREFIX'),
});

export class ProcessProductGroupsUtils {
    static getEnvVars(): Record<string, string> {
        return {
            cloudshelfAPI: process.env.CLOUDSHELF_API_URL || '',
            shopifyConnectorHost: process.env.SHOPIFY_CONNECTOR_HOST || '',
            cloudflareR2PublicEndpoint: process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT || '',
            filePrefix: process.env.FILE_PREFIX || '',
        };
    }

    static validateAndGetEnvVars(): { error: Error | null; envVars: Record<string, string> } {
        const { error } = schema.validate(ProcessProductGroupsUtils.getEnvVars());
        if (error) {
            logger.error(`Invalid environment variables: ${error.message}`);
            return { error, envVars: {} };
        }
        return { error: null, envVars: ProcessProductGroupsUtils.getEnvVars() };
    }

    static async handleComplete({
        em,
        msg,
        retailer,
        fullSync,
        payload,
    }: {
        em: EntityManager;
        msg: string;
        retailer?: RetailerEntity;
        fullSync?: boolean;
        payload: { fullSync?: boolean };
    }) {
        logger.info('handleComplete', { msg, retailer: retailer?.id ?? 'no retailer', fullSync: payload?.fullSync });
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
    }

    static async writeToFile(dataUrl: string): Promise<string> {
        const tempFileId = ulid();
        const tempFile = `/tmp/${tempFileId}.jsonl`;
        logger.info(`Downloading data url: ${dataUrl} to ${tempFile}`);
        const writer = createWriteStream(tempFile);
        await axios.get(dataUrl, { responseType: 'stream' }).then(response => {
            response.data.pipe(writer);
            return finished(writer);
        });
        return tempFile;
    }

    static async readJsonl(
        tempFile: string,
    ): Promise<{ productGroupInputs: ProductGroupInput[]; productsInGroups: { [productGroupId: string]: string[] } }> {
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
        return { productGroupInputs, productsInGroups };
    }

    static async getBulkOperationRecordAndRetailer({
        em,
        remoteBulkOperationId,
    }: {
        em: EntityManager;
        remoteBulkOperationId: string;
    }) {
        const bulkOperationRecord = await BulkOperationUtils.getOneByThirdPartyId(em, remoteBulkOperationId);

        if (!bulkOperationRecord) {
            logger.error(`Bulk operation record not found for id "${remoteBulkOperationId}"`);
            throw new Error(`Bulk operation record not found for id "${remoteBulkOperationId}"`);
        }

        logger.info(`Consuming collections for bulk operation "${remoteBulkOperationId}"`, {
            bulkOperationRecord,
        });

        const retailer = await em.findOne(RetailerEntity, { domain: bulkOperationRecord.domain });

        if (!retailer) {
            logger.error(`Retailer does not exist for domain "${bulkOperationRecord.domain}"`);
            throw new Error(`Retailer does not exist for domain "${bulkOperationRecord.domain}"`);
        }

        retailer.syncErrorCode = null;

        return { bulkOperationRecord, retailer };
    }

    static async updateProductGroups({
        em,
        retailer,
        productsInGroups,
        cloudshelfAPI,
    }: {
        em: EntityManager;
        retailer: RetailerEntity;
        productsInGroups: { [productGroupId: string]: string[] };
        cloudshelfAPI: string;
    }) {
        const productGroupUpdateBatch: ProductGroupUpdateBatchItem[] = [];
        const maxBatchSize = 5;

        for (const [productGroupId, productIds] of Object.entries(productsInGroups)) {
            const reversedProductIds = productIds.slice().reverse();
            productGroupUpdateBatch.push({
                productGroupId,
                productIds: reversedProductIds,
            });

            if (productGroupUpdateBatch.length >= maxBatchSize) {
                const response = await CloudshelfApiProductUtils.updateProductsInProductGroupInBatches({
                    apiUrl: cloudshelfAPI,
                    domain: retailer.domain,
                    productGroupUpdateBatch,
                });
                logger.info(`Updated products in product group in batches`, { response });
                productGroupUpdateBatch.length = 0;
            }
        }

        if (productGroupUpdateBatch.length > 0) {
            await CloudshelfApiProductUtils.updateProductsInProductGroupInBatches({
                apiUrl: cloudshelfAPI,
                domain: retailer.domain,
                productGroupUpdateBatch,
            });
        }
    }
}

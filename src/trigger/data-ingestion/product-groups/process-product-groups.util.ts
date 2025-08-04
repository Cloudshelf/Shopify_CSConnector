import * as Joi from 'joi';
import { ProductGroupInput, ProductGroupUpdateBatchItem } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/postgresql';
import { CloudshelfApiProductUtils } from '../../../modules/cloudshelf/cloudshelf.api.products.util';
import { BulkOperationUtils } from '../../../modules/data-ingestion/bulk.operation.utils';
import { PostSyncJobUtils } from '../../../modules/data-ingestion/sync.job.utils';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { logger } from '@trigger.dev/sdk';
import axios from 'axios';
import { createWriteStream } from 'fs';
import { finished } from 'stream/promises';
import { ulid } from 'ulid';

const SCHEMA = Joi.object({
    SHOPIFY_CONNECTOR_HOST: Joi.string().required().uri(),
    CLOUDFLARE_R2_PUBLIC_ENDPOINT: Joi.string().required().uri(),
    FILE_PREFIX: Joi.string().required(),
    CLOUDSHELF_API_URL: Joi.string().required().uri(),
});

export class ProcessProductGroupsUtils {
    static MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '5');

    static getEnvVars(): Record<string, string> {
        return {
            CLOUDSHELF_API_URL: process.env.CLOUDSHELF_API_URL || '',
            SHOPIFY_CONNECTOR_HOST: process.env.SHOPIFY_CONNECTOR_HOST || '',
            CLOUDFLARE_R2_PUBLIC_ENDPOINT: process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT || '',
            FILE_PREFIX: process.env.FILE_PREFIX || '',
        };
    }

    static validateAndGetEnvVars(): { error: Error | null; envVars: Record<string, string> } {
        const { error } = SCHEMA.validate(ProcessProductGroupsUtils.getEnvVars());
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
        payload,
    }: {
        em: EntityManager;
        msg: string;
        retailer?: RetailerEntity;
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
        logger.info(`handleComplete: ${msg}`);
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
                    image = ProcessProductGroupsUtils.handleFeaturedImage({
                        product: p,
                        image,
                    });
                    ProcessProductGroupsUtils.handleProductInCollection({
                        product: p,
                        productsInGroups,
                        collectionId,
                    });
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
        retailer,
        productsInGroups,
        cloudshelfAPI,
    }: {
        retailer: RetailerEntity;
        productsInGroups: { [productGroupId: string]: string[] };
        cloudshelfAPI: string;
    }) {
        const productGroupUpdateBatch: ProductGroupUpdateBatchItem[] = [];

        for (const [productGroupId, productIds] of Object.entries(productsInGroups)) {
            const reversedProductIds = productIds.slice().reverse();
            logger.info(`Product Group: ${productGroupId}, ${reversedProductIds.length} products`, {
                reversedProductIds,
            });
            productGroupUpdateBatch.push({
                productGroupId,
                productIds: reversedProductIds,
            });

            if (productGroupUpdateBatch.length >= ProcessProductGroupsUtils.MAX_BATCH_SIZE) {
                const used = productGroupUpdateBatch.slice();
                const response = await CloudshelfApiProductUtils.updateProductsInProductGroupInBatches({
                    apiUrl: cloudshelfAPI,
                    domain: retailer.domain,
                    productGroupUpdateBatch: used,
                });
                logger.info(`Updated products in product group in batches`, { response });
                productGroupUpdateBatch.length = 0;
            }
        }

        if (productGroupUpdateBatch.length > 0) {
            const response = await CloudshelfApiProductUtils.updateProductsInProductGroupInBatches({
                apiUrl: cloudshelfAPI,
                domain: retailer.domain,
                productGroupUpdateBatch,
            });
            logger.info(`Updated products in product group in batches`, { response });
        }
    }

    static handleFeaturedImage({
        product,
        image,
    }: {
        product: { featuredImage?: { url?: string } };
        image: string | undefined;
    }): string | undefined {
        if (product.featuredImage?.url) {
            if (image === undefined || image === '') {
                return product.featuredImage.url;
            }
        }
        return image;
    }

    static handleProductInCollection({
        product,
        productsInGroups,
        collectionId,
    }: {
        product: { id: string; featuredImage?: { url?: string } };
        productsInGroups: { [productGroupId: string]: string[] };
        collectionId: string;
    }) {
        const productId = GlobalIDUtils.gidConverter(product.id, 'ShopifyProduct')!;

        if (productsInGroups[collectionId] === undefined) {
            productsInGroups[collectionId] = [productId];
        } else {
            productsInGroups[collectionId].push(productId);
        }
    }
}

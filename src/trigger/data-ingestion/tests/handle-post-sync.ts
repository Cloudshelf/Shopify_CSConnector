import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import _ from 'lodash';
import { CloudshelfApiUtils } from '../../../modules/cloudshelf/cloudshelf.api.util';
import { BulkOperationUtils } from '../../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { S3Utils } from '../../../utils/S3Utils';
import { AppDataSource } from '../../reuseables/orm';
import { sleep } from '../../reuseables/sleep';
import { logger, task, wait } from '@trigger.dev/sdk/v3';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { ProductJobUtils } from 'src/modules/data-ingestion/product.job.utils';
import { IngestionQueue } from 'src/trigger/queues';
import { TriggerWaitForNobleReschedule } from 'src/trigger/reuseables/noble_pollfills';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

async function buildCollectionIdsQuery(retailer: RetailerEntity): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    return `{
        collections {
          edges {
            node {
              id
              ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
            }
          }
        }
      }`;
}

async function buildProductIdsQuery(retailer: RetailerEntity): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    let queryString = '';
    const queryParts: string[] = [];

    queryParts.push('status:ACTIVE');

    if (queryParts.length > 0) {
        queryString = `(query: \"${queryParts.join(' AND ')}\")`;
    }
    return `{
        products${queryString} {
          edges {
            node {
              id
              ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
              variants {
                  edges {
                    node {
                      id
                    }
                }
              }
            }
          }
        }
      }`;
}

async function handleCollections(
    em: EntityManager,
    retailer: RetailerEntity,
    filePrefix: string,
    cloudflarePublicEndpoint: string,
    cloudshelfAPI: string,
): Promise<{
    earlyCompleteMessage?: string;
    total?: number;
}> {
    logger.warn(`STARTING HandleCollections`);
    //request data from shopify for products.
    logger.info(`Building query payload`);
    const collectionQueryPayload = await buildCollectionIdsQuery(retailer);

    logger.info(`Requesting bulk operation with payload`, { collectionQueryPayload });
    let collectionBuildOperation = await BulkOperationUtils.requestBulkOperation(
        em,
        retailer,
        BulkOperationType.PostSync,
        collectionQueryPayload,
        false,
        {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        },
    );

    do {
        //Wait for the operation to complete
        await wait.for({ seconds: 10 });

        collectionBuildOperation = await BulkOperationUtils.updateFromShopify(em, retailer, collectionBuildOperation, {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });
        logger.info('Updated Bulk Op From Shopify', { op: collectionBuildOperation });
    } while (collectionBuildOperation.status === BulkOperationStatus.Running);

    if (!collectionBuildOperation.dataUrl || collectionBuildOperation.status !== BulkOperationStatus.Completed) {
        logger.warn(`Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`);

        //if shopify didn't return any data... there is nothing we can do here
        return {
            earlyCompleteMessage: `No Data URL, or shopify job failed. Status: ${collectionBuildOperation.status}`,
        };
    }

    const tempFileId = ulid();
    const tempFile = `/tmp/${tempFileId}.jsonl`;
    logger.info(`Downloading data url: ${collectionBuildOperation.dataUrl} to ${tempFile}`);
    const writer = createWriteStream(tempFile);
    await axios.get(collectionBuildOperation.dataUrl, { responseType: 'stream' }).then(response => {
        response.data.pipe(writer);
        return finished(writer);
    });

    logger.info(`Reading data file`);
    const seenCollectionIds: string[] = [];
    const idsToRemoveAtTheEnd: string[] = [];
    for await (const collectionObj of JsonLUtils.readJsonl(tempFile)) {
        await sleep(1);
        const collectionId = GlobalIDUtils.gidConverter(collectionObj.id, 'ShopifyCollection')!;

        if (!seenCollectionIds.includes(collectionId)) {
            seenCollectionIds.push(collectionId);
        }

        if (collectionObj.publishedOnCurrentPublication !== undefined && !collectionObj.publishedOnCurrentPublication) {
            idsToRemoveAtTheEnd.push(collectionId);
        }
    }

    logger.info(`Deleting downloaded data file: ${tempFile}`);
    await fsPromises.unlink(tempFile);

    const objectCount =
        typeof collectionBuildOperation.objectCount === 'string'
            ? parseInt(collectionBuildOperation.objectCount, 10)
            : collectionBuildOperation.objectCount;

    if (seenCollectionIds.length !== objectCount) {
        logger.error('Seen Collection ID length != Obejct Count in Bulk operation', {
            seenCollectionIds: seenCollectionIds.length,
            objectCount: objectCount,
        });
        return {
            earlyCompleteMessage: `Seen Collection ID length != Object Count in Bulk operation (seen:${seenCollectionIds.length}, objectCount: ${objectCount})`,
        };
    } else {
        logger.log(`Seen Collection Id & Object count MATCH!`);
    }
    //now we should call the cloushelf API to keep known data
    const groupContentToSave: { id: string }[] = [];
    for (const id of seenCollectionIds) {
        if (!idsToRemoveAtTheEnd.includes(id)) {
            groupContentToSave.push({ id });
        }
    }

    try {
        const groupFileName = `${filePrefix}_${retailer.domain}_product_groups_${ulid()}.json`;
        let groupUrl = cloudflarePublicEndpoint;
        if (!groupUrl.endsWith('/')) {
            groupUrl += '/';
        }
        groupUrl += `${groupFileName}`;
        const didGroupFileUpload = await S3Utils.UploadJsonFile(
            JSON.stringify(groupContentToSave),
            'product-deletion-payloads',
            groupFileName,
        );
        logger.info(`${groupContentToSave.length} Collections Uploaded?: ${didGroupFileUpload}. URL: ${groupUrl}`);
        if (didGroupFileUpload) {
            logger.info(`Starting delete product groups via file`);
            await CloudshelfApiUtils.keepKnownProductGroupsViaFile(cloudshelfAPI, retailer.domain, groupUrl);
            logger.info(`Finished delete product groups via file`);
        }
    } catch (err) {
        logger.error('Something went wrong while reporting known data', { error: err });
    }

    logger.warn(`FINISHED HandleCollections`);
    return {
        total: groupContentToSave.length,
    };
}

async function handleProducts(
    em: EntityManager,
    retailer: RetailerEntity,
    filePrefix: string,
    cloudflarePublicEndpoint: string,
    cloudshelfAPI: string,
): Promise<{
    earlyCompleteMessage?: string;
    productTotal?: number;
    variantTotal?: number;
}> {
    //todo
    logger.warn(`STARTING handleProducts`);

    logger.info(`Building query payload`);
    const productQueryPayload = await buildProductIdsQuery(retailer);

    logger.info(`Requesting bulk operation with payload`, { productQueryPayload });
    let productBulkOperation = await BulkOperationUtils.requestBulkOperation(
        em,
        retailer,
        BulkOperationType.PostSync,
        productQueryPayload,
        false,
        {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        },
    );

    do {
        //Wait for the operation to complete
        await wait.for({ seconds: 10 });

        productBulkOperation = await BulkOperationUtils.updateFromShopify(em, retailer, productBulkOperation, {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });
        logger.info('Updated Bulk Op From Shopify', { op: productBulkOperation });
    } while (productBulkOperation.status === BulkOperationStatus.Running);

    if (!productBulkOperation.dataUrl || productBulkOperation.status !== BulkOperationStatus.Completed) {
        logger.warn(`Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`);

        //if shopify didn't return any data... there is nothing we can do here
        return {
            earlyCompleteMessage: `No Data URL, or shopify job failed. Status: ${productBulkOperation.status}`,
        };
    }

    const tempFileId = ulid();
    const tempFile = `/tmp/${tempFileId}.jsonl`;
    logger.info(`Downloading data url: ${productBulkOperation.dataUrl} to ${tempFile}`);
    const writer = createWriteStream(tempFile);
    await axios.get(productBulkOperation.dataUrl, { responseType: 'stream' }).then(response => {
        response.data.pipe(writer);
        return finished(writer);
    });

    logger.info(`Reading data file`);
    const seenVariantIds: string[] = [];
    const seenProductIds: string[] = [];
    const prodIdsToRemoveAtTheEnd: string[] = [];
    const varIdsToRemoveAtTheEnd: string[] = [];
    for await (const productObj of JsonLUtils.readJsonl(tempFile)) {
        await sleep(1);
        const productId = GlobalIDUtils.gidConverter(productObj.id, 'ShopifyProduct')!;

        if (!seenProductIds.includes(productId)) {
            seenProductIds.push(productId);
        }

        if (productObj.publishedOnCurrentPublication !== undefined && !productObj.publishedOnCurrentPublication) {
            prodIdsToRemoveAtTheEnd.push(productId);
        }

        (productObj.ProductVariant ?? []).map((variant: any, variantIndex: number) => {
            const variantId = GlobalIDUtils.gidConverter(variant.id, 'ShopifyProductVariant')!;

            if (!seenVariantIds.includes(variantId)) {
                seenVariantIds.push(variantId);
            }

            //Then if the variant is from a product we dont want add it to teh removal list
            if (productObj.publishedOnCurrentPublication !== undefined && !productObj.publishedOnCurrentPublication) {
                varIdsToRemoveAtTheEnd.push(variantId);
            }
        });
    }

    logger.info(`Deleting downloaded data file: ${tempFile}`);
    await fsPromises.unlink(tempFile);

    const totalSeenObjectLength = seenProductIds.length + seenVariantIds.length;
    const objectCount =
        typeof productBulkOperation.objectCount === 'string'
            ? parseInt(productBulkOperation.objectCount, 10)
            : productBulkOperation.objectCount;

    if (totalSeenObjectLength !== objectCount) {
        logger.error('Seen ID length != Obejct Count in Bulk operation', {
            totalSeen: totalSeenObjectLength,
            seenProductIds: seenProductIds.length,
            seenVariantIds: seenVariantIds.length,
            objectCount: objectCount,
        });
        return {
            earlyCompleteMessage: `Seen ID length !== Object Count in Bulk operation (seen:${totalSeenObjectLength},objectCount: ${objectCount})`,
        };
    } else {
        logger.log(`Seen Id & Object count MATCH!`);
    }

    //now we should call the cloushelf API to keep known data
    const productContentToSave: { id: string }[] = [];
    for (const id of seenProductIds) {
        if (!prodIdsToRemoveAtTheEnd.includes(id)) {
            productContentToSave.push({ id });
        }
    }
    try {
        const prodFileName = `${filePrefix}_${retailer.domain}_products_${ulid()}.json`;
        let prodUrl = cloudflarePublicEndpoint;
        if (!prodUrl.endsWith('/')) {
            prodUrl += '/';
        }
        prodUrl += `${prodFileName}`;
        const didProdFileUpload = await S3Utils.UploadJsonFile(
            JSON.stringify(productContentToSave),
            'product-deletion-payloads',
            prodFileName,
        );
        logger.info(`${productContentToSave.length} Prods Uploaded?: ${didProdFileUpload}. URL: ${prodUrl}`);
        if (didProdFileUpload) {
            logger.info(`Starting delete products via file`);
            await CloudshelfApiUtils.keepKnownProductsViaFile(cloudshelfAPI, retailer.domain, prodUrl);
            logger.info(`Finished delete products via file`);
        }
    } catch (err) {
        logger.error('Something went wrong while reporting known product data', { error: err });
    }

    const variantContentToSave: { id: string }[] = [];
    for (const id of seenVariantIds) {
        if (!varIdsToRemoveAtTheEnd.includes(id)) {
            variantContentToSave.push({ id });
        }
    }
    try {
        const variantFileName = `${filePrefix}_${retailer.domain}_variants_${ulid()}.json`;
        let variantUrl = cloudflarePublicEndpoint;
        if (!variantUrl.endsWith('/')) {
            variantUrl += '/';
        }
        variantUrl += `${variantFileName}`;
        const didVarFileUpload = await S3Utils.UploadJsonFile(
            JSON.stringify(variantContentToSave),
            'product-deletion-payloads',
            variantFileName,
        );
        logger.info(`${variantContentToSave.length} Variants Uploaded?: ${didVarFileUpload}. URL: ${variantUrl}`);
        if (didVarFileUpload) {
            logger.info(`Starting delete variants via file`);
            await CloudshelfApiUtils.keepKnownVariantsViaFile(cloudshelfAPI, retailer.domain, variantUrl);
            logger.info(`Finished delete variants via file`);
        }
    } catch (err) {
        logger.error('Something went wrong while reporting known variant data', { error: err });
    }

    logger.warn(`FINISHED handleProducts`);
    return {
        productTotal: productContentToSave.length,
        variantTotal: variantContentToSave.length,
    };
}

export const HandlePostSync = task({
    id: 'handle-post-sync',
    queue: IngestionQueue,
    machine: { preset: `medium-1x` },
    run: async (payload: { organisationId: string }, { ctx }) => {
        logger.info('Payload', payload);
        const handleComplete = async (em: EntityManager, msg: string, retailer?: RetailerEntity) => {
            logger.info('handleComplete', { msg, retailer: retailer?.id ?? 'no retailer' });
            if (retailer) {
                await ProductJobUtils.scheduleTriggerJob(retailer, false, undefined, undefined, {
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

        const retailer = await em.findOne(RetailerEntity, { id: payload.organisationId });

        if (!retailer) {
            logger.error(`Retailer does not exist for id "${payload.organisationId}"`);
            throw new Error(`Retailer does not exist for id "${payload.organisationId}"`);
        }
        //got a retailer, so we can continue.
        retailer.syncErrorCode = null;

        try {
            await TriggerWaitForNobleReschedule(retailer);

            const collectionResult = await handleCollections(
                em,
                retailer,
                filePrefix,
                cloudflarePublicEndpoint,
                cloudshelfAPI,
            );

            if (collectionResult.earlyCompleteMessage) {
                await handleComplete(em, collectionResult.earlyCompleteMessage, retailer);
                return;
            }

            const productResult = await handleProducts(
                em,
                retailer,
                filePrefix,
                cloudflarePublicEndpoint,
                cloudshelfAPI,
            );

            if (productResult.earlyCompleteMessage) {
                await handleComplete(em, productResult.earlyCompleteMessage, retailer);
                return;
            }

            const input = {
                knownNumberOfProductGroups: collectionResult.total,
                knownNumberOfProducts: productResult.productTotal,
                knownNumberOfProductVariants: productResult.variantTotal,
                knownNumberOfImages: undefined,
            };
            logger.info(`Reporting catalog stats to cloudshelf: ${JSON.stringify(input)}`);
            await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
        } catch (err) {
            if (typeof err.message === 'string' && err.message.includes('status code 401')) {
                logger.warn('Ignoring ApolloError with status code 401 (Retailer uninstalled?)');
                retailer.syncErrorCode = '401';
                const input = {
                    storeClosed: true,
                };
                logger.info(`Reporting retailer closed.`, { input });
                await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
            } else if (typeof err.message === 'string' && err.message.includes('status code 402')) {
                logger.warn('Ignoring ApolloError with status code 402 (Retailer has outstanding shopify bill)');
                retailer.syncErrorCode = '402';
                const input = {
                    storeClosed: true,
                };
                logger.info(`Reporting retailer closed.`, { input });
                await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
            } else if (typeof err.message === 'string' && err.message.includes('status code 404')) {
                logger.warn('Ignoring ApolloError with status code 404 (Retailer Closed)');
                retailer.syncErrorCode = '404';
                const input = {
                    storeClosed: true,
                };
                logger.info(`Reporting retailer closed.`, { input });
                await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
            } else {
                throw err;
            }
        } finally {
            await handleComplete(em, 'job complete', retailer);
        }
    },
});

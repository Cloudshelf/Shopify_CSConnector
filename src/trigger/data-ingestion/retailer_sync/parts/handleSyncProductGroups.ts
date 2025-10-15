import { ProductGroupInput, ProductGroupUpdateBatchItem, SyncStage } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/postgresql';
import { AbortTaskRunError, logger } from '@trigger.dev/sdk';
import { CloudshelfApiCloudshelfUtils } from 'src/modules/cloudshelf/cloudshelf.api.cloudshelf.util';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { BulkOperation } from 'src/modules/data-ingestion/bulk.operation.entity';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerSyncEnvironmentConfig } from 'src/trigger/reuseables/env_validation';
import { getLoggerHelper } from 'src/trigger/reuseables/loggerObject';
import { SyncOptions, SyncStyle } from 'src/trigger/syncOptions.type';
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { JsonLUtils } from 'src/utils/JsonLUtils';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';
import { handleStoreClosedError } from '../../../reuseables/handleStoreClosedError';
import { requestAndWaitForBulkOperation } from '../../../reuseables/requestAndWaitForBulkOperation';
import { deleteTempFile, downloadTempFile } from '../../../reuseables/tempFileUtils';
import { buildQueryCollectionInfo } from '../queries/buildQueryCollectionInfo';

export const PROCESS_PRODUCTGROUP_JSONL_CHUNK_SIZE = 1000;
export const MAX_BATCH_SIZE = parseInt(process.env.MAX_BATCH_SIZE || '5');

async function readJsonl(
    tempFile: string,
): Promise<{ productGroupInputs: ProductGroupInput[]; productsInGroups: { [productGroupId: string]: string[] } }> {
    const productGroupInputs: ProductGroupInput[] = [];
    const productsInGroups: { [productGroupId: string]: string[] } = {};

    for await (const collectionObj of JsonLUtils.readJsonl(tempFile)) {
        const collectionId = GlobalIDUtils.gidConverter(collectionObj.id, 'ShopifyCollection')!;
        if ('publishedOnCurrentPublication' in collectionObj && collectionObj.publishedOnCurrentPublication === false) {
            logger.info(`Skipping collection ${collectionId} as it is not published on current publication`);
            continue;
        }
        let image: string | undefined = undefined;
        if (collectionObj.image?.url) {
            image = collectionObj.image.url;
        }
        if (collectionObj.Product) {
            for (const p of collectionObj.Product) {
                image = handleFeaturedImage({
                    product: p,
                    image,
                });
                handleProductInCollection({
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

async function updateProductGroups({
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
        logger.info(`Adding Product Group: ${productGroupId}, ${reversedProductIds.length} products to batch`, {
            reversedProductIds,
        });
        productGroupUpdateBatch.push({
            productGroupId,
            productIds: reversedProductIds,
        });

        if (productGroupUpdateBatch.length >= MAX_BATCH_SIZE) {
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

function handleFeaturedImage({
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

async function handleProductInCollection({
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

export async function handleSyncProductGroups(
    env: RetailerSyncEnvironmentConfig,
    appDataSource: EntityManager,
    retailer: RetailerEntity,
    syncOptions: SyncOptions,
    runId: string,
) {
    await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
        apiUrl: env.CLOUDSHELF_API_URL,
        retailer,
        syncStage: SyncStage.RequestProductGroups,
    });

    if (syncOptions.style === SyncStyle.FULL) {
        logger.info('Building ProductGroup Data Bulk Operation Payload; Entire Store');
    } else {
        logger.info(
            `Building ProductGroup Data Bulk Operation Payload; Only Data changed since ${
                syncOptions.changesSince ? syncOptions.changesSince.toISOString() : 'UNDEFINED'
            }`,
        );
    }

    const tags = TriggerTagsUtils.createTags({
        domain: retailer.domain,
        retailerId: retailer.id,
        syncStage: SyncStage.RequestProductGroups,
    });

    const queryPayload = await buildQueryCollectionInfo(retailer, syncOptions.changesSince);
    let requestedBulkOperation: BulkOperation | undefined = undefined;
    try {
        requestedBulkOperation = await requestAndWaitForBulkOperation({
            appDataSource,
            retailer,
            operationType: BulkOperationType.ProductGroupSync,
            queryPayload,
            syncStyle: syncOptions.style,
            timeoutSeconds: 600,
            maxWaits: 100,
            logs: getLoggerHelper(),
            waitpointTags: tags,
        });
    } catch (err) {
        await handleStoreClosedError(appDataSource, err, retailer, env.CLOUDSHELF_API_URL, runId);
    }

    if (!requestedBulkOperation) {
        throw new AbortTaskRunError(`Missing Bulk Operation`);
    }

    if (requestedBulkOperation.status === BulkOperationStatus.Running) {
        throw new AbortTaskRunError(`Bulk Operation still running after max wait`);
    }

    if (!requestedBulkOperation.dataUrl) {
        //no need to sync anything
        logger.info('No dataURL exists after bulk operation finished');
        return;
    }

    // Download the bulk operation data to a temp file
    let tempFilePath: string | undefined;
    try {
        tempFilePath = await downloadTempFile(requestedBulkOperation.dataUrl);

        //Tell the Cloudshelf API that we are now processing products
        await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
            apiUrl: env.CLOUDSHELF_API_URL,
            retailer,
            syncStage: SyncStage.ProcessProductGroups,
        });

        logger.info(`Reading data file`);
        const { productGroupInputs, productsInGroups } = await readJsonl(tempFilePath);

        logger.info(`Upserting collections to cloudshelf`, { data: JSON.stringify(productGroupInputs) });
        await CloudshelfApiProductUtils.updateProductGroups(
            env.CLOUDSHELF_API_URL,
            retailer.domain,
            productGroupInputs,
            getLoggerHelper(),
        );

        logger.info(`Updating products in ${Object.entries(productsInGroups).length} product groups on cloudshelf`);
        await updateProductGroups({
            retailer,
            productsInGroups,
            cloudshelfAPI: env.CLOUDSHELF_API_URL,
        });

        logger.info(`Finished reporting all products in all groups`);
        logger.info(`Creating first cloud shelf if required`);
        await CloudshelfApiCloudshelfUtils.createFirstCloudshelfIfRequired(
            env.CLOUDSHELF_API_URL,
            appDataSource,
            retailer,
            getLoggerHelper(),
        );

        retailer.lastProductGroupSync = new Date();
        await appDataSource.flush();

        if (syncOptions.style === SyncStyle.FULL) {
            const input = {
                knownNumberOfProductGroups: productGroupInputs.length,
                knownNumberOfProducts: undefined,
                knownNumberOfProductVariants: undefined,
                knownNumberOfImages: undefined,
            };
            logger.info(`Reporting catalog stats to cloudshelf.`, { data: JSON.stringify(input) });
            await CloudshelfApiReportUtils.reportCatalogStats(env.CLOUDSHELF_API_URL, retailer.domain, input);
        }
    } catch (err) {
        await CloudshelfApiOrganisationUtils.failOrganisationSync({
            apiUrl: env.CLOUDSHELF_API_URL,
            domainName: retailer.domain,
        });
        throw new AbortTaskRunError(`Unknown Error in handleSyncProductGroups: ${JSON.stringify(err)}`);
    } finally {
        // Ensure temp file is cleaned up even if an error occurs
        if (tempFilePath) {
            await deleteTempFile(tempFilePath);
        }
    }
}

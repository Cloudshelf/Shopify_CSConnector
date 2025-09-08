import { SyncStage } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/postgresql';
import { AbortTaskRunError, logger } from '@trigger.dev/sdk';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { BulkOperation } from 'src/modules/data-ingestion/bulk.operation.entity';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerSyncEnvironmentConfig } from 'src/trigger/reuseables/env_validation';
import { getLoggerHelper } from 'src/trigger/reuseables/loggerObject';
import { setDifference } from 'src/trigger/reuseables/noble_pollfills';
import { SyncOptions } from 'src/trigger/syncOptions.type';
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { JsonLUtils } from 'src/utils/JsonLUtils';
import { S3Utils } from 'src/utils/S3Utils';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';
import { ulid } from 'ulid';
import { handleStoreClosedError } from '../../../reuseables/handleStoreClosedError';
import { requestAndWaitForBulkOperation } from '../../../reuseables/requestAndWaitForBulkOperation';
import { deleteTempFile, downloadTempFile } from '../../../reuseables/tempFileUtils';
import { buildQueryCollectionIds } from '../queries/buildQueryCollectionIds';
import { buildQueryProductIds } from '../queries/buildQueryProductIds';

async function handleSyncCleanupCollections(
    env: RetailerSyncEnvironmentConfig,
    appDataSource: EntityManager,
    retailer: RetailerEntity,
    syncOptions: SyncOptions,
): Promise<{ collectionTotal: number } | undefined> {
    const tags = TriggerTagsUtils.createTags({
        domain: retailer.domain,
        retailerId: retailer.id,
        syncStage: SyncStage.CleanUp,
    });

    const queryPayload = await buildQueryCollectionIds(retailer);
    let requestedBulkOperationCollections: BulkOperation | undefined = undefined;
    try {
        requestedBulkOperationCollections = await requestAndWaitForBulkOperation({
            appDataSource,
            retailer,
            operationType: BulkOperationType.PostSync,
            queryPayload,
            syncStyle: syncOptions.style,
            timeoutSeconds: 20,
            maxWaits: 100,
            logs: getLoggerHelper(),
            waitpointTags: tags,
        });
    } catch (err) {
        await handleStoreClosedError(appDataSource, err, retailer, env.CLOUDSHELF_API_URL);
    }

    if (!requestedBulkOperationCollections) {
        throw new AbortTaskRunError(`Missing Bulk Operation`);
    }

    if (!requestedBulkOperationCollections.dataUrl) {
        //no need to sync anything
        logger.info('No dataURL exists after requestedBulkOperationCollections finished');
        return;
    }

    //setup some storage
    const seenCollectionIds = new Set<string>();
    const idsToRemoveAtTheEnd = new Set<string>();

    let tempFilePathCollections: string | undefined;
    try {
        tempFilePathCollections = await downloadTempFile(requestedBulkOperationCollections.dataUrl);

        //Read all the JSONL data into our storage
        for await (const collectionObj of JsonLUtils.readJsonl(tempFilePathCollections)) {
            const collectionId = GlobalIDUtils.gidConverter(collectionObj.id, 'ShopifyCollection')!;

            seenCollectionIds.add(collectionId);

            const shouldRemove =
                collectionObj.publishedOnCurrentPublication !== undefined &&
                !collectionObj.publishedOnCurrentPublication;

            if (shouldRemove) {
                idsToRemoveAtTheEnd.add(collectionId);
            }
        }

        //Now do a sanity check that shopify didnt lie
        const objectCount =
            typeof requestedBulkOperationCollections.objectCount === 'string'
                ? parseInt(requestedBulkOperationCollections.objectCount, 10)
                : requestedBulkOperationCollections.objectCount;

        if (seenCollectionIds.size !== objectCount) {
            logger.error('Seen Collection ID length != Object Count in Bulk operation', {
                seenCollectionIds: seenCollectionIds.size,
                objectCount: objectCount,
            });
            seenCollectionIds.clear();
            idsToRemoveAtTheEnd.clear();
            //We will NOT DELETE data from shopify
            return undefined;
        } else {
            logger.info(`Seen Collection Id & Object count MATCH!`);
        }
    } catch (err) {
        logger.error(err);
        return undefined;
    } finally {
        // Ensure temp file is cleaned up even if an error occurs
        if (tempFilePathCollections) {
            await deleteTempFile(tempFilePathCollections);
        }
    }

    //now we should call the cloushelf API to keep known data
    const colsIdsToKeep = setDifference(seenCollectionIds, idsToRemoveAtTheEnd);
    const groupContentToSave: { id: string }[] = Array.from(colsIdsToKeep, id => ({ id }));

    try {
        const groupFileName = `${env.FILE_PREFIX}_${retailer.domain}_product_groups_${ulid()}.json`;
        let groupUrl = env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
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
            await CloudshelfApiProductUtils.keepKnownProductGroupsViaFile(
                env.CLOUDSHELF_API_URL,
                retailer.domain,
                groupUrl,
                getLoggerHelper(),
            );
            logger.info(`Finished delete product groups via file`);
        }
    } catch (err) {
        logger.error('Something went wrong while reporting known data', { error: err });
    } finally {
        seenCollectionIds.clear();
        idsToRemoveAtTheEnd.clear();
    }

    return { collectionTotal: groupContentToSave.length };
}

async function handleSyncCleanupProductsAndVariants(
    env: RetailerSyncEnvironmentConfig,
    appDataSource: EntityManager,
    retailer: RetailerEntity,
    syncOptions: SyncOptions,
): Promise<{ productTotal: number; variantTotal: number } | undefined> {
    const tags = TriggerTagsUtils.createTags({
        domain: retailer.domain,
        retailerId: retailer.id,
        syncStage: SyncStage.CleanUp,
    });

    const queryPayload = await buildQueryProductIds(retailer);
    let requestedBulkOperation: BulkOperation | undefined = undefined;
    try {
        requestedBulkOperation = await requestAndWaitForBulkOperation({
            appDataSource,
            retailer,
            operationType: BulkOperationType.PostSync,
            queryPayload,
            syncStyle: syncOptions.style,
            timeoutSeconds: 20,
            maxWaits: 100,
            logs: getLoggerHelper(),
            waitpointTags: tags,
        });
    } catch (err) {
        await handleStoreClosedError(appDataSource, err, retailer, env.CLOUDSHELF_API_URL);
    }

    if (!requestedBulkOperation) {
        throw new AbortTaskRunError(`Missing Bulk Operation`);
    }

    if (!requestedBulkOperation.dataUrl) {
        //no need to sync anything
        logger.info('No dataURL exists after requestedBulkOperation finished');
        return;
    }

    //setup some storage
    const seenVariantIds = new Set<string>();
    const seenProductIds = new Set<string>();
    const prodIdsToRemoveAtTheEnd = new Set<string>();
    const varIdsToRemoveAtTheEnd = new Set<string>();

    let tempFilePath: string | undefined;
    try {
        tempFilePath = await downloadTempFile(requestedBulkOperation.dataUrl);

        //Read all the JSONL data into our storage
        for await (const productObj of JsonLUtils.readJsonl(tempFilePath)) {
            const productId = GlobalIDUtils.gidConverter(productObj.id, 'ShopifyProduct');
            if (!productId) {
                continue; // Skip invalid product IDs
            }

            seenProductIds.add(productId);

            const shouldRemove =
                productObj.publishedOnCurrentPublication !== undefined && !productObj.publishedOnCurrentPublication;

            if (shouldRemove) {
                prodIdsToRemoveAtTheEnd.add(productId);
            }

            for (const variant of productObj.ProductVariant ?? []) {
                const variantId = GlobalIDUtils.gidConverter(variant.id, 'ShopifyProductVariant');
                if (!variantId) {
                    continue; // Skip invalid variant IDs
                }

                seenVariantIds.add(variantId);

                if (shouldRemove) {
                    varIdsToRemoveAtTheEnd.add(variantId);
                }
            }
        }

        //Now do a sanity check that shopify didnt lie
        const totalSeenObjectLength = seenProductIds.size + seenVariantIds.size;
        const objectCount =
            typeof requestedBulkOperation.objectCount === 'string'
                ? parseInt(requestedBulkOperation.objectCount, 10)
                : requestedBulkOperation.objectCount;

        if (totalSeenObjectLength !== objectCount) {
            logger.error('Seen ID length != Obejct Count in Bulk operation', {
                totalSeen: totalSeenObjectLength,
                seenProductIds: seenProductIds.size,
                seenVariantIds: seenVariantIds.size,
                objectCount: objectCount,
            });
            seenProductIds.clear();
            seenVariantIds.clear();
            prodIdsToRemoveAtTheEnd.clear();
            varIdsToRemoveAtTheEnd.clear();
            //We will not delete data
            return undefined;
        } else {
            logger.info(`Seen Id & Object count MATCH!`);
        }
    } catch (err) {
        logger.error(err);
        return undefined;
    } finally {
        // Ensure temp file is cleaned up even if an error occurs
        if (tempFilePath) {
            await deleteTempFile(tempFilePath);
        }
    }

    //now we should call the cloushelf API to keep known data
    const prodIdsToKeep = setDifference(seenProductIds, prodIdsToRemoveAtTheEnd);
    const productContentToSave: { id: string }[] = Array.from(prodIdsToKeep, id => ({ id }));

    try {
        const prodFileName = `${env.FILE_PREFIX}_${retailer.domain}_products_${ulid()}.json`;
        let prodUrl = env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
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
            await CloudshelfApiProductUtils.keepKnownProductsViaFile(
                env.CLOUDSHELF_API_URL,
                retailer.domain,
                prodUrl,
                getLoggerHelper(),
            );
            logger.info(`Finished delete products via file`);
        }
    } catch (err) {
        logger.error('Something went wrong while reporting known product data', { error: err });
    } finally {
        seenProductIds.clear();
        prodIdsToRemoveAtTheEnd.clear();
    }

    const variantIdsToKeep = setDifference(seenVariantIds, varIdsToRemoveAtTheEnd);
    const variantContentToSave: { id: string }[] = Array.from(variantIdsToKeep, id => ({ id }));

    try {
        const variantFileName = `${env.FILE_PREFIX}_${retailer.domain}_variants_${ulid()}.json`;
        let variantUrl = env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
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
            await CloudshelfApiProductUtils.keepKnownVariantsViaFile(
                env.CLOUDSHELF_API_URL,
                retailer.domain,
                variantUrl,
                getLoggerHelper(),
            );
            logger.info(`Finished delete variants via file`);
        }
    } catch (err) {
        logger.error('Something went wrong while reporting known variant data', { error: JSON.stringify(err) });
    } finally {
        seenVariantIds.clear();
        varIdsToRemoveAtTheEnd.clear();
    }

    return {
        productTotal: productContentToSave.length,
        variantTotal: variantContentToSave.length,
    };
}

export async function handleSyncCleanup(
    env: RetailerSyncEnvironmentConfig,
    appDataSource: EntityManager,
    retailer: RetailerEntity,
    syncOptions: SyncOptions,
) {
    await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
        apiUrl: env.CLOUDSHELF_API_URL,
        retailer,
        syncStage: SyncStage.CleanUp,
    });

    const collectionResult = await handleSyncCleanupCollections(env, appDataSource, retailer, syncOptions);

    const productAndVariantResult = await handleSyncCleanupProductsAndVariants(
        env,
        appDataSource,
        retailer,
        syncOptions,
    );

    const input: {
        knownNumberOfProductGroups?: number;
        knownNumberOfProducts?: number;
        knownNumberOfProductVariants?: number;
        knownNumberOfImages?: number; // we dont have image count here...
    } = {};

    if (collectionResult) {
        input.knownNumberOfProductGroups = collectionResult.collectionTotal;
    }

    if (productAndVariantResult) {
        input.knownNumberOfProducts = productAndVariantResult.productTotal;
        input.knownNumberOfProductVariants = productAndVariantResult.variantTotal;
    }

    await CloudshelfApiReportUtils.reportCatalogStats(
        env.CLOUDSHELF_API_URL,
        retailer.domain,
        input,
        getLoggerHelper(),
    );

    await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
        apiUrl: env.CLOUDSHELF_API_URL,
        retailer,
        syncStage: SyncStage.Done,
    });
}

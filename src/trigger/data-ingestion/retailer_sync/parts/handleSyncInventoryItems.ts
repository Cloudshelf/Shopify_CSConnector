import { StockLevelInput, SyncStage } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/postgresql';
import _ from 'lodash';
import { AbortTaskRunError, logger } from '@trigger.dev/sdk';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiStockLevelsUtils } from 'src/modules/cloudshelf/cloudshelf.api.stocklevels.util';
import { BulkOperation } from 'src/modules/data-ingestion/bulk.operation.entity';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerSyncEnvironmentConfig } from 'src/trigger/reuseables/env_validation';
import { getLoggerHelper } from 'src/trigger/reuseables/loggerObject';
import { SyncOptions } from 'src/trigger/syncOptions.type';
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { JsonLUtils } from 'src/utils/JsonLUtils';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';
import { handleStoreClosedError } from '../../../reuseables/handleStoreClosedError';
import { requestAndWaitForBulkOperation } from '../../../reuseables/requestAndWaitForBulkOperation';
import { deleteTempFile, downloadTempFile } from '../../../reuseables/tempFileUtils';
import { buildQueryInventoryItems } from '../queries/buildQueryInventoryItems';

export const PROCESS_STOCKLEVELS_JSONL_CHUNK_SIZE = 1000;
export const STOCKLEVELS_CHUNK_UPLOAD_SIZE = 1000;

export async function handleSyncInventoryItems(
    env: RetailerSyncEnvironmentConfig,
    appDataSource: EntityManager,
    retailer: RetailerEntity,
    syncOptions: SyncOptions,
    runId: string,
) {
    await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
        apiUrl: env.CLOUDSHELF_API_URL,
        retailer,
        syncStage: SyncStage.RequestStockLevels,
    });

    const tags = TriggerTagsUtils.createTags({
        domain: retailer.domain,
        retailerId: retailer.id,
        syncStage: SyncStage.RequestStockLevels,
    });

    const queryPayload = await buildQueryInventoryItems(retailer, syncOptions.changesSince);
    let requestedBulkOperation: BulkOperation | undefined = undefined;
    try {
        requestedBulkOperation = await requestAndWaitForBulkOperation({
            appDataSource,
            retailer,
            operationType: BulkOperationType.InventoryItemSync,
            queryPayload,
            syncStyle: syncOptions.style,
            timeoutSeconds: 600,
            maxWaits: 100,
            logs: getLoggerHelper(),
            waitpointTags: tags,
        });
    } catch (err) {
        await handleStoreClosedError({ appDataSource, err, retailer, cloudshelfApiUrl: env.CLOUDSHELF_API_URL, runId });
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
            syncStage: SyncStage.ProcessStockLevels,
        });

        //setup some storage
        const stockLevelInputs: StockLevelInput[] = [];

        //Read all the JSONL data into our storage
        for await (const inventoryItemsInJsonLChunk of JsonLUtils.readJsonlChunked(
            tempFilePath,
            PROCESS_STOCKLEVELS_JSONL_CHUNK_SIZE,
        )) {
            logger.info(`--- Chunk Started ---`);
            for (const inventoryItemInJsonL of inventoryItemsInJsonLChunk) {
                const inventoryItem = inventoryItemInJsonL as any;
                const isTracked = inventoryItem.tracked || false;
                const variantId = GlobalIDUtils.gidConverter(inventoryItem.variant.id, 'ShopifyProductVariant')!;

                for (const inventoryLevel of inventoryItem.InventoryLevel ?? []) {
                    const locationId = GlobalIDUtils.gidConverter(inventoryLevel.location.id, 'ShopifyLocation')!;
                    const quantity = inventoryLevel.quantities.find((q: any) => q.name === 'available')?.quantity ?? 0;

                    stockLevelInputs.push({
                        locationId: locationId,
                        productVariantId: variantId,
                        quantity: quantity,
                    });
                }
            }
            logger.info(`--- Chunk finished ---`);
        }

        logger.info(
            `Upserting ${stockLevelInputs.length} stock levels to cloudshelf for current file, in chunks of ${STOCKLEVELS_CHUNK_UPLOAD_SIZE}`,
        );
        const chunkedStockLevelInputs = _.chunk(stockLevelInputs, STOCKLEVELS_CHUNK_UPLOAD_SIZE);
        for (const chunk of chunkedStockLevelInputs) {
            logger.info(`Upserting ${chunk.length} stock levels to cloudshelf for current file`);
            await CloudshelfApiStockLevelsUtils.upsertStockLevels(
                env.CLOUDSHELF_API_URL,
                retailer.domain,
                chunk,
                getLoggerHelper(),
            );
        }

        await appDataSource.flush();
    } catch (err) {
        await CloudshelfApiOrganisationUtils.failOrganisationSync({
            apiUrl: env.CLOUDSHELF_API_URL,
            domainName: retailer.domain,
        });
        throw new AbortTaskRunError(`Unknown Error in HandleSyncInventoryItems: ${JSON.stringify(err)}`);
    } finally {
        // Ensure temp file is cleaned up even if an error occurs
        if (tempFilePath) {
            await deleteTempFile(tempFilePath);
        }
    }
}

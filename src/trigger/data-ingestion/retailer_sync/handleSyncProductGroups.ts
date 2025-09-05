import {
    KeyValuePairInput,
    MetadataInput,
    MetaimageInput,
    ProductInput,
    ProductVariantInput,
    SyncStage,
    UpsertVariantsInput,
} from 'src/graphql/cloudshelf/generated/cloudshelf';
import { BulkOperationStatus } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/postgresql';
import _ from 'lodash';
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
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { JsonLUtils } from 'src/utils/JsonLUtils';
import { ProcessProductGroupsUtils } from '../product-groups/process-product-groups.util';
import { buildCollectionTriggerQueryPayload } from './buildCollectionTriggerQueryPayload';
import { buildProductTriggerQueryPayload } from './buildProductTriggerQueryPayload';
import { handleStoreClosedError } from './handleStoreClosedError';
import { requestAndWaitForBulkOperation } from './requestAndWaitForBulkOperation';
import { deleteTempFile, downloadTempFile } from './tempFileUtils';

export const PROCESS_PRODUCTGROUP_JSONL_CHUNK_SIZE = 1000;

export async function handleSyncProductGroups(
    env: RetailerSyncEnvironmentConfig,
    appDataSource: EntityManager,
    retailer: RetailerEntity,
    syncOptions: {
        style: 'full' | 'partial';
        changesSince?: Date;
    },
) {
    await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
        apiUrl: env.CLOUDSHELF_API_URL,
        retailer,
        syncStage: SyncStage.RequestProductGroups,
    });

    if (syncOptions.style === 'full') {
        logger.info('Building ProductGroup Data Bulk Operation Payload; Entire Store');
    } else {
        logger.info(
            `Building ProductGroup Data Bulk Operation Payload; Only Data changed since ${
                syncOptions.changesSince ? syncOptions.changesSince.toISOString() : 'UNDEFINED'
            }`,
        );
    }

    const queryPayload = await buildCollectionTriggerQueryPayload(retailer, syncOptions.changesSince);
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
            waitpointTags: [], //todo: waitpoint tags
        });
    } catch (err) {
        await handleStoreClosedError(appDataSource, err, retailer, env.CLOUDSHELF_API_URL);
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
        const { productGroupInputs, productsInGroups } = await ProcessProductGroupsUtils.readJsonl(tempFilePath);

        logger.info(`Upserting collections to cloudshelf`, { data: JSON.stringify(productGroupInputs) });
        await CloudshelfApiProductUtils.updateProductGroups(
            env.CLOUDSHELF_API_URL,
            retailer.domain,
            productGroupInputs,
            getLoggerHelper(),
        );

        logger.info(`Updating products in ${Object.entries(productsInGroups).length} product groups on cloudshelf`);
        await ProcessProductGroupsUtils.updateProductGroups({
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

        if (syncOptions.style === 'full') {
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

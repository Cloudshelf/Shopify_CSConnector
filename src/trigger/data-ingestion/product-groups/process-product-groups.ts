import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { getDbForTrigger } from '../../reuseables/db';
import { ProcessProductGroupsUtils } from './process-product-groups.util';
import { logger, task } from '@trigger.dev/sdk';
import { promises as fsPromises } from 'fs';
import { CloudshelfApiCloudshelfUtils } from 'src/modules/cloudshelf/cloudshelf.api.cloudshelf.util';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { IngestionQueue } from 'src/trigger/queues';

const runInternal = async (payload: { remoteBulkOperationId: string; fullSync: boolean }) => {
    const {
        error,
        envVars: { cloudshelfAPI },
    } = ProcessProductGroupsUtils.validateAndGetEnvVars();
    if (error) {
        logger.error(`Invalid environment variables: ${error.message}`);
        throw new Error(`Invalid environment variables: ${error.message}`);
    }

    const AppDataSource = getDbForTrigger();
    if (!AppDataSource) {
        logger.error(`AppDataSource is not set`);
        throw new Error(`AppDataSource is not set`);
    }

    const em = AppDataSource.em.fork({
        flushMode: FlushMode.COMMIT,
    });

    const { bulkOperationRecord, retailer } = await ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer({
        em,
        remoteBulkOperationId: payload.remoteBulkOperationId,
    });

    if (!bulkOperationRecord.dataUrl || bulkOperationRecord.status !== BulkOperationStatus.Completed) {
        logger.warn(`Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`);
        await ProcessProductGroupsUtils.handleComplete({
            em,
            msg: `No Data URL, or shopify job failed. Status: ${bulkOperationRecord.status}`,
            retailer,
            fullSync: payload.fullSync,
            payload,
        });
        //if shopify didn't return any data... there is nothing we can do here
        return;
    }

    const tempFile = await ProcessProductGroupsUtils.writeToFile(bulkOperationRecord.dataUrl);
    if (payload.fullSync) {
        logger.info(`Full collection update`);
    } else {
        logger.info(`Partial collection update`);
    }

    logger.info(`Reading data file`);
    const { productGroupInputs, productsInGroups } = await ProcessProductGroupsUtils.readJsonl(tempFile);

    logger.info(`Upserting collections to cloudshelf`, { productGroupInputs });
    await CloudshelfApiProductUtils.updateProductGroups(cloudshelfAPI, retailer.domain, productGroupInputs, {
        info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
        warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
        error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
    });

    logger.info(`Updating products in ${Object.entries(productsInGroups).length} product groups on cloudshelf`);
    await ProcessProductGroupsUtils.updateProductGroups({
        em,
        retailer,
        productsInGroups,
        cloudshelfAPI,
    });

    logger.info(`Finished reporting all products in all groups`);
    logger.info(`Creating first cloud shelf if required`);
    await CloudshelfApiCloudshelfUtils.createFirstCloudshelfIfRequired(cloudshelfAPI, em, retailer, {
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
        await CloudshelfApiReportUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
    }
    await ProcessProductGroupsUtils.handleComplete({
        em,
        msg: 'job complete',
        retailer,
        fullSync: payload.fullSync,
        payload,
    });
};

export const ProcessProductGroupsTask = task({
    id: 'process-product-groups',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
    run: async (payload: { remoteBulkOperationId: string; fullSync: boolean }) => {
        logger.info('Payload', payload);
        await runInternal(payload);
    },
});

import { BulkOperationStatus } from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { MikroORM } from '@mikro-orm/postgresql';
import { BulkOperationUtils } from '../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { logger, wait } from '@trigger.dev/sdk';

export let AppDataSource: MikroORM | undefined;

export const TriggerWaitForNobleReschedule = async (retailer: RetailerEntity) => {
    let shouldBeWaitingForQueue = true;
    do {
        logger.info(`Checking for running bulk operation`);
        const currentBulkOperation = await BulkOperationUtils.checkForRunningBulkOperationByRetailer(retailer, {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });

        if (currentBulkOperation) {
            if (currentBulkOperation.status === BulkOperationStatus.Running) {
                logger.warn(
                    `Shopify is already running a bulk operation for this store. ${JSON.stringify(
                        currentBulkOperation,
                    )}`,
                );

                //Here in noble we would reschedule for 2 minutes... in trigger we wait for 2 minutes (wait is not billed)
                await wait.for({ minutes: 2 });
            } else {
                shouldBeWaitingForQueue = false;
                logger.info(`Exising bulk operation, but not running (${currentBulkOperation.status})`);
            }
        } else {
            shouldBeWaitingForQueue = false;
            logger.info(`No running bulk operation`);
        }
    } while (shouldBeWaitingForQueue);
};

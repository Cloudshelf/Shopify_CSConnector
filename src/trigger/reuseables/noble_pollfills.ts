import { BulkOperationStatus } from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { logger, wait } from '@trigger.dev/sdk';
import { BulkOperationUtils } from '../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';

export const TriggerWaitForNobleReschedule = async (retailer: RetailerEntity) => {
    let shouldBeWaitingForQueue = true;
    do {
        logger.info(`Checking for running bulk operation`);
        const currentBulkOperation = await BulkOperationUtils.checkForRunningBulkOperationByRetailer({
            retailer,
            logs: {
                info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
            },
        });

        if (currentBulkOperation) {
            if (
                currentBulkOperation.status === BulkOperationStatus.Running ||
                currentBulkOperation.status === BulkOperationStatus.Created
            ) {
                logger.warn(
                    `Shopify is already running or starting up a bulk operation for this store. ${JSON.stringify(
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

export const setDifference = (a: Set<string>, b: Set<string>): Set<string> => {
    const result = new Set<string>();
    for (const item of a) {
        if (!b.has(item)) result.add(item);
    }
    return result;
};

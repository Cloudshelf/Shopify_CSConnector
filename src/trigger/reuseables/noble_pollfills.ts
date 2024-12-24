import { BulkOperationStatus } from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { MikroORM } from '@mikro-orm/postgresql';
import { BulkOperationUtils } from '../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { logger, wait } from '@trigger.dev/sdk/v3';

export let AppDataSource: MikroORM | undefined;

export const TriggerWaitForNobleReschedule = async (retailer: RetailerEntity) => {
    let shouldBeWaitingForQueue = true;
    do {
        logger.info(`Checking for running bulk operation`);
        const currentBulkOperation = await BulkOperationUtils.checkForRunningBulkOperationByRetailer(retailer, {
            info: logger.info,
            error: logger.error,
            warn: logger.warn,
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
            }
        } else {
            shouldBeWaitingForQueue = false;
        }
    } while (shouldBeWaitingForQueue);
};

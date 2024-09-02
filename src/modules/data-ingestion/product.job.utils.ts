import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { ProcessProductsTask } from 'src/trigger/data-ingestion/product/process-products';
import { RequestProductsTask } from 'src/trigger/data-ingestion/product/request-products';

export class ProductJobUtils {
    static async scheduleTriggerJob(retailer: RetailerEntity, fullSync?: boolean, delayOverride?: number) {
        let delay: string = '20m';

        if (fullSync) {
            delay = '10s';
        }

        if (delayOverride) {
            delay = `${delayOverride}s`;
        }

        await RequestProductsTask.trigger(
            {
                organisationId: retailer.id,
                fullSync: fullSync ?? false,
            },
            {
                delay,
                queue: {
                    name: `ingestion`,
                    concurrencyLimit: 1,
                },
                tags: [`retailer_${retailer.id}`],

                concurrencyKey: retailer.id,
            },
        );
    }

    static async scheduleConsumerJob(retailer: RetailerEntity, bulkOp: BulkOperation) {
        await ProcessProductsTask.trigger(
            {
                remoteBulkOperationId: bulkOp.shopifyBulkOpId,
                fullSync: bulkOp.installSync,
            },
            {
                queue: {
                    name: `ingestion`,
                    concurrencyLimit: 1,
                },
                concurrencyKey: retailer.id,
            },
        );
    }
}

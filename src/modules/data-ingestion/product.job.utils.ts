import { ProcessProductsTask } from '../../trigger/data-ingestion/product/process-products';
import { RequestProductsTask } from '../../trigger/data-ingestion/product/request-products';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';

export class ProductJobUtils {
    static async scheduleTriggerJob(
        retailer: RetailerEntity,
        fullSync?: boolean,
        delayOverride?: number,
        reason?: string,
    ) {
        const tags: string[] = [`retailer_${retailer.id}`, fullSync ? 'type_full' : 'type_partial'];
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        let delay = '20m';

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
                tags,
                concurrencyKey: retailer.id,
            },
        );
    }

    static async scheduleConsumerJob(retailer: RetailerEntity, bulkOp: BulkOperation, reason?: string) {
        const delay = '1s';
        const tags: string[] = [`retailer_${retailer.id}`, bulkOp.installSync ? 'type_full' : 'type_partial'];
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        await ProcessProductsTask.trigger(
            {
                remoteBulkOperationId: bulkOp.shopifyBulkOpId,
                fullSync: bulkOp.installSync,
            },
            {
                delay,
                queue: {
                    name: `ingestion`,
                    concurrencyLimit: 1,
                },
                tags,
                concurrencyKey: retailer.id,
            },
        );
    }
}

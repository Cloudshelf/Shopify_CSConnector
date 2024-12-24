import { ProcessProductGroupsTask } from '../../trigger/data-ingestion/product-groups/process-product-groups';
import { RequestProductGroupsTask } from '../../trigger/data-ingestion/product-groups/request-product-groups';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';

export class CollectionJobUtils {
    static async scheduleTriggerJob(retailer: RetailerEntity, fullSync?: boolean, reason?: string) {
        const tags: string[] = [`retailer_${retailer.id}`, fullSync ? 'type_full' : 'type_partial'];
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        const delay = '1s';

        await RequestProductGroupsTask.trigger(
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

        await ProcessProductGroupsTask.trigger(
            {
                remoteBulkOperationId: bulkOp.shopifyBulkOpId,
                fullSync: bulkOp.installSync ?? false,
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

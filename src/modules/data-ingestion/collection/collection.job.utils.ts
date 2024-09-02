import { RetailerEntity } from '../../retailer/retailer.entity';
import { BulkOperation } from '../bulk.operation.entity';
import { ProcessProductGroupsTask } from 'src/trigger/product-groups/process-product-groups';
import { RequestProductGroupsTask } from 'src/trigger/product-groups/request-product-groups';

export class CollectionJobUtils {
    static async scheduleTriggerJob(retailer: RetailerEntity, fullSync?: boolean) {
        let delay: string = '1s';

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
                tags: [`retailer_${retailer.id}`],

                concurrencyKey: retailer.id,
            },
        );
    }

    static async scheduleConsumerJob(retailer: RetailerEntity, bulkOp: BulkOperation) {
        const delay = '1s';
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
                tags: [`retailer_${retailer.id}`],

                concurrencyKey: retailer.id,
            },
        );
    }
}

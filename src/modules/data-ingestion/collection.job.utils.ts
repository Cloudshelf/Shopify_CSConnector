import { ProcessProductGroupsTask } from '../../trigger/data-ingestion/product-groups/process-product-groups';
import { RequestProductGroupsTask } from '../../trigger/data-ingestion/product-groups/request-product-groups';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { idempotencyKeys } from '@trigger.dev/sdk/v3';

export class CollectionJobUtils {
    static async scheduleTriggerJob(
        retailer: RetailerEntity,
        fullSync?: boolean,
        reason?: string,
        logs?: LogsInterface,
    ) {
        const tags: string[] = [
            `retailer_${retailer.id}`,
            `domain_${retailer.domain.toLowerCase()}`,
            fullSync ? 'type_full' : 'type_partial',
        ];
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

    static async scheduleConsumerJob(
        retailer: RetailerEntity,
        bulkOp: BulkOperation,
        reason?: string,
        logs?: LogsInterface,
    ) {
        const delay = '1s';
        const tags: string[] = [
            `retailer_${retailer.id}`,
            `domain_${retailer.domain.toLowerCase()}`,

            bulkOp.installSync ? 'type_full' : 'type_partial',
        ];
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        logs?.info(
            `Asking trigger to schhedule productgroup consumer job for retailer ${retailer.domain} and bulk op ${bulkOp.shopifyBulkOpId}`,
        );
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
                idempotencyKey: await idempotencyKeys.create(bulkOp.shopifyBulkOpId),
            },
        );
    }
}

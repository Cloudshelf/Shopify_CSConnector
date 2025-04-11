import { ProcessProductGroupsTask } from '../../trigger/data-ingestion/product-groups/process-product-groups';
import { RequestProductGroupsTask } from '../../trigger/data-ingestion/product-groups/request-product-groups';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { idempotencyKeys } from '@trigger.dev/sdk';
import { ProcessProductGroupsForDeletionTask } from 'src/trigger/data-ingestion/tests/process-product-groups-for-deletion';
import { RequestProductGroupsForDeletionTask } from 'src/trigger/data-ingestion/tests/request-product-groups-for-deletion';

export class CollectionJobUtils {
    static async scheduleDELETETriggerJob(retailer: RetailerEntity, reason?: string, logs?: LogsInterface) {
        const tags: string[] = [`retailer_${retailer.id}`, `domain_${retailer.domain.toLowerCase()}`, `test_DELETE`];
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        const delay = '20m';

        await RequestProductGroupsForDeletionTask.trigger(
            {
                organisationId: retailer.id,
            },
            {
                delay,
                queue: `ingestion`,
                tags,
                concurrencyKey: retailer.id,
            },
        );
    }

    static async scheduleDELETEConsumerJob(
        retailer: RetailerEntity,
        bulkOp: BulkOperation,
        reason?: string,
        logs?: LogsInterface,
    ) {
        const delay = '1s';
        const tags: string[] = [`retailer_${retailer.id}`, `domain_${retailer.domain.toLowerCase()}`, `test_DELETE`];
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        logs?.info(
            `Asking trigger to schhedule productgroup delete consumer job for retailer ${retailer.domain} and bulk op ${bulkOp.shopifyBulkOpId}`,
        );
        await ProcessProductGroupsForDeletionTask.trigger(
            {
                remoteBulkOperationId: bulkOp.shopifyBulkOpId,
            },
            {
                delay,
                queue: `ingestion`,
                tags,
                concurrencyKey: retailer.id,
                idempotencyKey: await idempotencyKeys.create(bulkOp.shopifyBulkOpId),
                machine: retailer.triggerMachineSizeProductGroups ?? undefined,
            },
        );
    }

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
                queue: `ingestion`,
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
                queue: `ingestion`,
                tags,
                concurrencyKey: retailer.id,
                idempotencyKey: await idempotencyKeys.create(bulkOp.shopifyBulkOpId),
                machine: retailer.triggerMachineSizeProductGroups ?? undefined,
            },
        );
    }
}

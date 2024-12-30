import { ProcessProductsTask } from '../../trigger/data-ingestion/product/process-products';
import { RequestProductsTask } from '../../trigger/data-ingestion/product/request-products';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { runs } from '@trigger.dev/sdk/v3';

export class ProductJobUtils {
    static async scheduleTriggerJob(
        retailer: RetailerEntity,
        fullSync?: boolean,
        delayOverride?: number,
        reason?: string,
        logs?: LogsInterface,
    ) {
        const retailerTag = `retailer_${retailer.id}`;
        const syncTypeTag = fullSync ? 'type_full' : 'type_partial';
        const tags: string[] = [retailerTag, syncTypeTag];
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

        // if its full sync, then cancel everything else
        // if its partial sync, and there is a full sync scheduled, cancel any partial syncs and then do nothing.
        // if its partial sync, and there is NO full sync scheduled, then if there is any partials do nothing, otherwise schedule

        const searchTags: string[] = [retailerTag];
        const pendingRuns: { id: string; type: 'type_full' | 'type_partial' }[] = [];

        for await (const run of runs.list({
            status: ['WAITING_FOR_DEPLOY', 'DELAYED', 'EXECUTING', 'FROZEN', 'INTERRUPTED', 'QUEUED', 'REATTEMPTING'],
            taskIdentifier: [RequestProductsTask.id],
            tag: searchTags,
        })) {
            const i: { id: string; type: 'type_full' | 'type_partial' } = {
                id: run.id,
                type: run.tags.includes('type_full') ? 'type_full' : 'type_partial',
            };
            pendingRuns.push(i);
            console.log(`pushing pending run`, i);
        }
        logs?.info(`Found ${pendingRuns.length} existing jobs...`);

        if (fullSync) {
            for (const runToCancel of pendingRuns) {
                logs?.info(`Cancelling ${runToCancel.id}`, runToCancel);
                await runs.cancel(runToCancel.id);
            }
        } else {
            const hasAnyFullSyncs = pendingRuns.filter(f => f.type === 'type_full').length > 0;
            const partialSyncRuns = pendingRuns.filter(f => f.type === 'type_partial');
            if (hasAnyFullSyncs) {
                for (const runToCancel of partialSyncRuns) {
                    logs?.info(`Cancelling ${runToCancel.id}`, runToCancel);
                    await runs.cancel(runToCancel.id);
                }
                //we dont want to schedule, so return
                logs?.info(`Not scheduling another run as there is already a pending full sync`);
                return;
            } else {
                if (partialSyncRuns.length > 0) {
                    //we dont want to schedule, so return
                    logs?.info(`Not scheduling another run as there is already a pending partial`);
                    return;
                }
            }
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

    static async scheduleConsumerJob(
        retailer: RetailerEntity,
        bulkOp: BulkOperation,
        reason?: string,
        logs?: LogsInterface,
    ) {
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
                idempotencyKey: bulkOp.shopifyBulkOpId,
            },
        );
    }
}

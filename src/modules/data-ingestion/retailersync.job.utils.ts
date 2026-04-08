import { ListRunsQueryParams } from '@trigger.dev/core/v3';
import { runs } from '@trigger.dev/sdk/v3';
import { RetailerSyncJob } from 'src/trigger/data-ingestion/retailer_sync/retailer-sync-job';
import { fetchEffectiveTaskConfig } from 'src/trigger/fetch-task-config';
import { TRIGGER_RUNS_STATUSES } from 'src/trigger/reuseables/runStatus';
import { SyncStyle } from 'src/trigger/syncOptions.type';
import { reportPendingToApi } from 'src/trigger/trigger-helpers';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';

export class RetailerSyncJobUtils {
    static async scheduleTriggerJob(
        retailer: RetailerEntity,
        syncStyle: SyncStyle,
        reason?: string,
        logs?: LogsInterface,
        currentJobId?: string,
        delays?: { min?: number; max?: number },
    ) {
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            syncType: syncStyle === SyncStyle.FULL ? 'type_full' : 'type_partial',
            reason,
        });

        const delaySeconds = delays?.min ?? 10;
        const delay = `${delaySeconds}s`;
        const debounceDelayMs = delaySeconds * 1000;
        const debounceMaxDelayMs = delays?.max ? delays.max * 1000 : debounceDelayMs * 3;
        const maxDelay = `${debounceMaxDelayMs}ms`;

        // if its full sync, then cancel everything else
        // if its partial sync, and there is a full sync scheduled, cancel any partial syncs and then do nothing.
        // if its partial sync, and there is NO full sync scheduled, then if there is any partials do nothing, otherwise schedule

        const searchTags: string[] = [TriggerTagsUtils.createRetailerTag(retailer.id)];
        const pendingRuns: { id: string; type: 'type_full' | 'type_partial' }[] = [];

        for await (const run of runs.list({
            status: TRIGGER_RUNS_STATUSES,
            taskIdentifier: [RetailerSyncJob.id],
            tag: searchTags,
        } as ListRunsQueryParams)) {
            if (!currentJobId || run.id !== currentJobId) {
                const i: { id: string; type: 'type_full' | 'type_partial' } = {
                    id: run.id,
                    type: run.tags.includes('type_full') ? 'type_full' : 'type_partial',
                };
                pendingRuns.push(i);
                console.log(`pushing pending run`, i);
            }
        }
        logs?.info(`Found ${pendingRuns.length} existing jobs...`);

        if (syncStyle === SyncStyle.FULL) {
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

        const taskConfig = await fetchEffectiveTaskConfig(retailer.domain, RetailerSyncJob.id);

        const handle = await RetailerSyncJob.trigger(
            {
                organisationId: retailer.id,
                fullSync: syncStyle === SyncStyle.FULL,
            },
            {
                debounce: {
                    key: retailer.id,
                    delay: delay,
                    maxDelay: maxDelay,
                    mode: 'trailing',
                },
                queue: `ingestion`,
                tags: tags,
                concurrencyKey: retailer.id,
                ...taskConfig,
            },
        );
        await reportPendingToApi(retailer.domain, RetailerSyncJob.id, handle.id, debounceDelayMs, debounceMaxDelayMs);
    }
}

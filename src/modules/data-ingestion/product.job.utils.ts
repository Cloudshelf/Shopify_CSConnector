import { EntityManager } from '@mikro-orm/postgresql';
import { ProcessProductsTask } from '../../trigger/data-ingestion/product/process-products';
import { RequestProductsTask } from '../../trigger/data-ingestion/product/request-products';
import { CloudshelfApiOrganisationUtils } from '../cloudshelf/cloudshelf.api.organisation.util';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { ListRunsQueryParams } from '@trigger.dev/core/v3';
import { idempotencyKeys, runs } from '@trigger.dev/sdk';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

const TRIGGER_RUNS_STATUSES: ListRunsQueryParams['status'][] = [
    'PENDING_VERSION',
    'DELAYED',
    'EXECUTING',
    'WAITING',
    'QUEUED',
];

export class ProductJobUtils {
    private static async cancelPendingJobs({ retailer, logs }: { retailer: RetailerEntity; logs?: LogsInterface }) {
        try {
            const searchTags: string[] = [TriggerTagsUtils.createRetailerTag(retailer.id)];
            for await (const run of runs.list({
                status: TRIGGER_RUNS_STATUSES,
                taskIdentifier: [RequestProductsTask.id],
                tag: searchTags,
            } as ListRunsQueryParams)) {
                logs?.info(`Cancelling ${run.id}`, run);
                await runs.cancel(run.id);
            }
        } catch (err) {
            logs?.error(`Error cancelling pending jobs for retailer ${retailer.domain}`, err);
        }
    }

    static async cancelAllPendingJobs({
        domainNames,
        logs,
        entityManager,
    }: {
        domainNames: string[];
        logs?: LogsInterface;
        entityManager: EntityManager;
    }) {
        const retailers = await entityManager.find(RetailerEntity, {
            domain: { $in: domainNames },
        });

        await Promise.all(retailers.map(retailer => this.cancelPendingJobs({ retailer, logs })));
    }

    static async scheduleTriggerJob(
        retailer: RetailerEntity,
        fullSync?: boolean,
        delayOverride?: number,
        reason?: string,
        logs?: LogsInterface,
    ) {
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            syncType: fullSync ? 'type_full' : 'type_partial',
            reason,
        });
        let delay = '60m';

        if (fullSync) {
            delay = '10s';
        }

        if (delayOverride) {
            delay = `${delayOverride}s`;
        }

        // if its full sync, then cancel everything else
        // if its partial sync, and there is a full sync scheduled, cancel any partial syncs and then do nothing.
        // if its partial sync, and there is NO full sync scheduled, then if there is any partials do nothing, otherwise schedule

        const searchTags: string[] = [TriggerTagsUtils.createRetailerTag(retailer.id)];
        const pendingRuns: { id: string; type: 'type_full' | 'type_partial' }[] = [];

        for await (const run of runs.list({
            status: TRIGGER_RUNS_STATUSES,
            taskIdentifier: [RequestProductsTask.id],
            tag: searchTags,
        } as ListRunsQueryParams)) {
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
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            syncType: bulkOp.installSync ? 'type_full' : 'type_partial',
            reason,
        });

        logs?.info(
            `Asking trigger to schedule product consumer job for retailer ${retailer.domain} and bulk op ${bulkOp.shopifyBulkOpId}`,
        );
        try {
            const idempotencyKey = await idempotencyKeys.create(bulkOp.shopifyBulkOpId);

            await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
                apiUrl: process.env.CLOUDSHELF_API_URL || '',
                domainName: retailer.domain,
                callbackIfActive: async () => {
                    const newTaskID = await ProcessProductsTask.trigger(
                        {
                            remoteBulkOperationId: bulkOp.shopifyBulkOpId,
                            fullSync: bulkOp.installSync,
                        },
                        {
                            delay,
                            queue: `ingestion`,
                            tags,
                            concurrencyKey: retailer.id,
                            idempotencyKey: idempotencyKey,
                            machine: retailer.triggerMachineSizeProducts ?? undefined,
                            maxDuration: retailer.triggerMaxDurationProducts ?? undefined,
                        },
                    );

                    logs?.info(`product consumer id: ${newTaskID.id}. idempotencyKey: ${idempotencyKey}`);
                },
            });
        } catch (err: any) {
            logs?.error(`Error in product consumer scheduler.`);
            logs?.error(`err`, err);
            throw err;
        }
    }
}

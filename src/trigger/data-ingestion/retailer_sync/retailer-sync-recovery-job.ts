import { OrganisationSyncRecoveryReason, SyncStatsPayload } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/core';
import { logger, runs, task } from '@trigger.dev/sdk/v3';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerStatus } from 'src/modules/retailer/retailer.status.enum';
import { IngestionQueue } from 'src/trigger/queues';
import { getDbForTrigger, getEnvConfig } from 'src/trigger/reuseables/initialization';
import { RetailerSyncJob } from './retailer-sync-job';

export type SyncStatusValue = 'ok' | 'overdue' | 'mismatch';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export const getSyncStatusFromIngestionStats = ({
    payload,
    now,
}: {
    payload?: SyncStatsPayload;
    now: Date;
}): SyncStatusValue | undefined => {
    if (!payload?.lastIngestionDataDate) {
        return undefined;
    }

    const lastIngestion = new Date(payload.lastIngestionDataDate);
    const ingestionIsStale = now.getTime() - lastIngestion.getTime() > ONE_DAY_IN_MS;

    if (ingestionIsStale) {
        return 'overdue';
    }

    const catalogStats = [
        payload.lastReportedCatalogStatsForProducts,
        payload.lastReportedCatalogStatsForVariants,
        payload.lastReportedCatalogStatsForProductGroups,
    ];

    const hasCatalogMismatch = catalogStats.some(stat => {
        if (!stat?.reportedAt) {
            return false;
        }

        const reportedAt = new Date(stat.reportedAt);
        const statIsStale = now.getTime() - reportedAt.getTime() > ONE_DAY_IN_MS;

        if (statIsStale) {
            return true;
        }

        return !stat.asExpected;
    });

    return hasCatalogMismatch ? 'mismatch' : 'ok';
};

export const getActiveRetailers = async (entityManager: EntityManager) => {
    const retailers = await entityManager.find(RetailerEntity, {
        status: RetailerStatus.ACTIVE,
    });
    return retailers;
};

export const getIngestionStatsPayload = async ({
    apiURL,
    domain,
    now,
}: {
    apiURL: string;
    domain: string;
    now: Date;
}) => {
    if (!apiURL || !domain) {
        return;
    }

    try {
        const ingestionStatsPayload = await CloudshelfApiProductUtils.getSyncStatsForShopify(apiURL, domain);
        return getSyncStatusFromIngestionStats({ payload: ingestionStatsPayload, now });
    } catch (error) {
        logger.error(`Failed to get ingestion stats payload for ${domain}`, { error: JSON.stringify(error) });
        return;
    }
};

export const recoverRetailerSync = async ({
    retailer,
    now,
    apiUrl,
}: {
    retailer: RetailerEntity;
    now: Date;
    apiUrl: string;
}) => {
    try {
        const syncStatus = await getIngestionStatsPayload({ apiURL: apiUrl, domain: retailer.domain, now });
        logger.info(`Retailer ${retailer.domain} sync status: ${syncStatus}`);

        switch (syncStatus) {
            case 'mismatch':
                await logger.trace(`Retailer ${retailer.domain} has a sync mismatch, triggering recovery`, async () => {
                    await RetailerSyncJob.trigger({
                        organisationId: retailer.id,
                        fullSync: true,
                        recoveryReason: OrganisationSyncRecoveryReason.Resync,
                    });
                });
                break;
            case 'overdue':
                await logger.trace(`Retailer ${retailer.domain} has a sync overdue, triggering recovery`, async () => {
                    await RetailerSyncJob.trigger({
                        organisationId: retailer.id,
                        fullSync: true,
                        recoveryReason: OrganisationSyncRecoveryReason.Unblock,
                    });
                });
                break;
            default:
                logger.info(`Retailer ${retailer.domain} has a sync ok, no recovery needed`);
                break;
        }
    } catch (error) {
        logger.error(`Failed to recover retailer sync for ${retailer.domain}`, { error: JSON.stringify(error) });
    }
};

export const runInternal = async ({ runId }: { runId: string }) => {
    for await (const run of runs.list({
        status: ['DELAYED'],
        taskIdentifier: [RetailerSyncRecoveryJob.id],
    })) {
        if (run.id !== runId) {
            logger.info(`Cancelling previous scheduled retailer sync recovery job: ${run.id}`);
            await runs.cancel(run.id);
        }
    }
    const env = getEnvConfig();
    const now = new Date();

    const em = await getDbForTrigger();
    const activeRetailers = await getActiveRetailers(em);

    const concurrency = 5;
    let index = 0;
    while (index < activeRetailers.length) {
        const batch = activeRetailers.slice(index, index + concurrency);
        await Promise.all(
            batch.map(retailer => recoverRetailerSync({ retailer, now, apiUrl: env.CLOUDSHELF_API_URL })),
        );
        index += concurrency;
    }
};

export const RetailerSyncRecoveryJob = task({
    id: 'retailer-sync-recovery-job',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
    run: async (payload: {}, { ctx }) => {
        try {
            await runInternal({ runId: ctx.run.id });
        } catch (error) {
            logger.error(`Failed to run retailer sync recovery job`, { error: JSON.stringify(error) });
            throw error;
        } finally {
            await RetailerSyncRecoveryJob.trigger(
                {},
                {
                    delay: '6h',
                    queue: `ingestion`,
                    concurrencyKey: 'retailer-sync-recovery-job',
                    machine: 'small-2x',
                },
            );
        }
    },
});

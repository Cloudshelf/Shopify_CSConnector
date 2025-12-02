import { SyncStage } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { AbortTaskRunError, logger, task } from '@trigger.dev/sdk';
import { subDays, subMinutes } from 'date-fns';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { RetailerSyncJobUtils } from 'src/modules/data-ingestion/retailersync.job.utils';
import { RetailerStatus } from 'src/modules/retailer/retailer.status.enum';
import { registerAllWebhooksForRetailer } from 'src/modules/tools/utils/registerAllWebhooksForRetailer';
import { IngestionQueue } from 'src/trigger/queues';
import { handleStoreClosedError } from 'src/trigger/reuseables/handleStoreClosedError';
import { TriggerWaitForNobleReschedule } from 'src/trigger/reuseables/noble_pollfills';
import { SyncStyle } from 'src/trigger/syncOptions.type';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { getDbForTrigger, getEnvConfig } from '../../reuseables/initialization';
import { getLoggerHelper } from '../../reuseables/loggerObject';
import { handleSyncCleanup } from './parts/handleSyncCleanup';
import { handleSyncInventoryItems } from './parts/handleSyncInventoryItems';
import { handleSyncProductGroups } from './parts/handleSyncProductGroups';
import { handleSyncProducts } from './parts/handleSyncProducts';

export const RetailerSyncJob = task({
    id: 'retailer-sync-job',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
    run: async (payload: { organisationId: string; fullSync: boolean }, { ctx }) => {
        logger.info(
            `Starting Retailer Sync for OrgId: ${payload.organisationId} Sync Style: ${
                payload.fullSync ? SyncStyle.FULL : SyncStyle.PARTIAL
            }`,
        );

        const env = getEnvConfig();
        const AppDataSource = getDbForTrigger();

        const retailer = await AppDataSource.findOne(RetailerEntity, { id: payload.organisationId });
        if (!retailer) {
            throw new AbortTaskRunError('No organisation found for the provided organsation id');
        }

        if (retailer.status === RetailerStatus.IDLE) {
            logger.info(`Retailer is hibernated, job should not have been scheduled; finishing early.`);
            return;
        }

        let changesSince: Date | undefined = undefined;
        const startedAtTime = subMinutes(new Date(), 1); //1 min in the past ensures we get a little overlap without massive amounts of over processing.

        try {
            if (payload.fullSync) {
                logger.info(`Registering Webhooks due to Full Sync`);
                await registerAllWebhooksForRetailer({
                    retailer,
                    host: env.SHOPIFY_CONNECTOR_HOST,
                    logs: getLoggerHelper(),
                    appDataSource: AppDataSource,
                    runId: ctx.run.id,
                });
            } else {
                changesSince = retailer.nextPartialSyncRequestTime ?? undefined;
                if (changesSince === undefined) {
                    //If we have never don't a partial sync, lets just get the last days worth of changes...
                    //This is just so we get something.
                    changesSince = subDays(new Date(), 1);
                }
                retailer.lastPartialSyncRequestTime = changesSince;
                logger.info('Setting lastPartialSyncRequestTime', {
                    lastPartialSyncRequestTime: retailer.lastPartialSyncRequestTime,
                });
            }

            await TriggerWaitForNobleReschedule(retailer);
        } catch (err) {
            logger.error(`There was a problem with the wait for noble reschedule: ${JSON.stringify(err)}`);
            await handleStoreClosedError({
                appDataSource: AppDataSource,
                err,
                retailer,
                cloudshelfApiUrl: env.CLOUDSHELF_API_URL,
                runId: ctx.run.id,
            });
            return;
        }

        try {
            await logger.trace(`Sync Products`, async () => {
                await handleSyncProducts(
                    env,
                    AppDataSource,
                    retailer,
                    {
                        style: payload.fullSync ? SyncStyle.FULL : SyncStyle.PARTIAL,
                        changesSince,
                    },
                    ctx.run.id,
                );
            });
            await logger.trace(`Sync Stock Levels`, async () => {
                await handleSyncInventoryItems(
                    env,
                    AppDataSource,
                    retailer,
                    {
                        style: payload.fullSync ? SyncStyle.FULL : SyncStyle.PARTIAL,
                        changesSince,
                    },
                    ctx.run.id,
                );
            });

            await logger.trace(`Sync Product groups`, async () => {
                await handleSyncProductGroups(
                    env,
                    AppDataSource,
                    retailer,
                    {
                        style: payload.fullSync ? SyncStyle.FULL : SyncStyle.PARTIAL,
                        changesSince,
                    },
                    ctx.run.id,
                );
            });

            await logger.trace(`Post Cleanup`, async () => {
                await handleSyncCleanup(
                    env,
                    AppDataSource,
                    retailer,
                    {
                        style: payload.fullSync ? SyncStyle.FULL : SyncStyle.PARTIAL,
                        changesSince,
                    },
                    ctx.run.id,
                );
            });
        } catch (err) {
            try {
                await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
                    apiUrl: env.CLOUDSHELF_API_URL,
                    retailer,
                    syncStage: SyncStage.Failed,
                });
            } catch (error) {
                logger.error(`There was problems with setting sync status to failed: ${JSON.stringify(error)}`);
            }
        }

        retailer.nextPartialSyncRequestTime = startedAtTime;
        logger.info('Setting nextPartialSyncRequestTime', {
            lastPartialSyncRequestTime: retailer.nextPartialSyncRequestTime,
        });

        if (payload.fullSync) {
            retailer.lastSafetySyncCompleted = new Date();
        }
        await AppDataSource.flush();
    },
    onComplete: async ({ payload, result, ctx }) => {
        const AppDataSource = getDbForTrigger();

        const retailer = await AppDataSource.findOne(RetailerEntity, { id: payload.organisationId });
        if (!retailer) {
            throw new AbortTaskRunError('No organisation found for the provided organsation id');
        }

        if (retailer.status === RetailerStatus.IDLE) {
            logger.info(
                `Retailer is hibernated, job should not have been scheduled; not allowing another job to be scheduled.`,
            );
            return;
        }

        await RetailerSyncJobUtils.scheduleTriggerJob(
            retailer,
            SyncStyle.PARTIAL,
            undefined,
            undefined,
            getLoggerHelper(),
            ctx.run.id,
        );
    },
});

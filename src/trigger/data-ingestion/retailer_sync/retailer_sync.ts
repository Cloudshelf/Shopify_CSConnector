import { AbortTaskRunError, logger, task } from '@trigger.dev/sdk';
import { subDays, subMinutes } from 'date-fns';
import { registerAllWebhooksForRetailer } from 'src/modules/tools/utils/registerAllWebhooksForRetailer';
import { IngestionQueue } from 'src/trigger/queues';
import { TriggerWaitForNobleReschedule } from 'src/trigger/reuseables/noble_pollfills';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { getDbForTrigger } from '../../reuseables/db';
import { validateEnvironmentForRetailerSync } from '../../reuseables/env_validation';
import { getLoggerHelper } from '../../reuseables/loggerObject';
import { handleSyncCleanup } from './handleSyncCleanup';
import { handleSyncProductGroups } from './handleSyncProductGroups';
import { handleSyncProducts } from './handleSyncProducts';

export const RetailerSyncJob = task({
    id: 'reailer-sync-job',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
    run: async (payload: { organisationId: string; fullSync: boolean }, { ctx }) => {
        logger.info(
            `Starting Retailer Sync for OrgId: ${payload.organisationId} Sync Style: ${
                payload.fullSync ? 'Full' : 'Partial'
            }`,
        );

        const env = validateEnvironmentForRetailerSync();
        const AppDataSource = getDbForTrigger();

        const retailer = await AppDataSource.findOne(RetailerEntity, { id: payload.organisationId });
        if (!retailer) {
            throw new AbortTaskRunError('No organisation found for the provided organsation id');
        }

        let changesSince: Date | undefined = undefined;
        const startedAtTime = subMinutes(new Date(), 1); //1 min in the past ensures we get a little overlap without massive amounts of over processing.
        if (payload.fullSync) {
            logger.info(`Registering Webhooks due to Full Sync`);
            await registerAllWebhooksForRetailer(retailer, env.SHOPIFY_CONNECTOR_HOST, getLoggerHelper());
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

        await handleSyncProducts(env, AppDataSource, retailer, {
            style: payload.fullSync ? 'full' : 'partial',
            changesSince,
        });

        await handleSyncProductGroups(env, AppDataSource, retailer, {
            style: payload.fullSync ? 'full' : 'partial',
            changesSince,
        });

        await handleSyncCleanup(env, AppDataSource, retailer, {
            style: payload.fullSync ? 'full' : 'partial',
            changesSince,
        });

        retailer.nextPartialSyncRequestTime = startedAtTime;
        logger.info('Setting nextPartialSyncRequestTime', {
            lastPartialSyncRequestTime: retailer.nextPartialSyncRequestTime,
        });
        await AppDataSource.flush();
    },
});

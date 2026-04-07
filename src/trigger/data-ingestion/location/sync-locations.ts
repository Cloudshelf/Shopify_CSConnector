import { logger, task, wait } from '@trigger.dev/sdk';
import { IngestionQueue } from 'src/trigger/queues';
import { TASK_DEFAULTS } from 'src/trigger/task-defaults';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { getDbForTrigger, getEnvConfig } from '../../reuseables/initialization';
import { handleSyncLocations } from '../retailer_sync/parts/handleSyncLocations';

export const SyncLocationsTask = task({
    id: 'sync-locations',
    queue: IngestionQueue,
    machine: TASK_DEFAULTS['sync-locations'].machineSize as any,
    maxDuration: TASK_DEFAULTS['sync-locations'].maxDuration,
    run: async (payload: { organisationId: string }, { ctx }) => {
        const env = getEnvConfig();
        const AppDataSource = getDbForTrigger();

        await wait.for({ seconds: 10 });

        const retailer = await AppDataSource.findOne(RetailerEntity, { id: payload.organisationId });

        if (!retailer) {
            logger.error(`Retailer does not exist for id "${payload.organisationId}"`);
            throw new Error(`Retailer does not exist for id "${payload.organisationId}"`);
        }

        await handleSyncLocations(env, AppDataSource, retailer, ctx.run.id);
    },
});

import { EntityManager } from '@mikro-orm/postgresql';
import { logger, schedules } from '@trigger.dev/sdk';
import { RetailerSyncJobUtils } from 'src/modules/data-ingestion/retailersync.job.utils';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { RetailerStatus } from '../../modules/retailer/retailer.status.enum';
import { CreateSafetySyncsQueue } from '../queues';
import { getDbForTrigger } from '../reuseables/initialization';
import { getLoggerHelper } from '../reuseables/loggerObject';
import { SyncStyle } from '../syncOptions.type';

export const CreateSafetySyncs = schedules.task({
    id: 'create-safety-syncs',
    cron: {
        pattern: '0 2 * * *',
        timezone: 'Europe/London',
    },
    machine: {
        preset: 'small-1x',
    },
    queue: CreateSafetySyncsQueue,
    run: async () => {
        const AppDataSource = getDbForTrigger();

        await internalScheduleTriggerJobs(AppDataSource);
    },
});

export async function internalScheduleTriggerJobs(em: EntityManager) {
    const retailers = await em.find(RetailerEntity, {});

    for (const retailer of retailers) {
        logger.debug('Creating safety sync for retailer ' + retailer.domain);

        if (retailer.status === RetailerStatus.IDLE) {
            logger.debug(`SafetySync: ${retailer.domain} is idle, skipping safety sync`);
            continue;
        }

        await RetailerSyncJobUtils.scheduleTriggerJob(
            retailer,
            SyncStyle.FULL,
            undefined,
            'safetySync',
            getLoggerHelper(),
        );
        retailer.lastSafetySyncRequested = new Date();
    }

    await em.flush();
}

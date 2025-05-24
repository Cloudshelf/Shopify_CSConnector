import { FlushMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProductJobUtils } from '../../modules/data-ingestion/product.job.utils';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { CreateSafetySyncsQueue } from '../queues';
import { getDbForTrigger } from '../reuseables/db';
import { logger, schedules } from '@trigger.dev/sdk';

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
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }

        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        await internalScheduleTriggerJobs(em);
    },
});

export async function internalScheduleTriggerJobs(em: EntityManager) {
    const retailers = await em.find(RetailerEntity, {});

    for (const retailer of retailers) {
        logger.debug('Creating safety sync for retailer ' + retailer.domain);
        await ProductJobUtils.scheduleTriggerJob(retailer, true, undefined, 'safetySync', {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });
        retailer.lastSafetySyncRequested = new Date();
    }

    await em.flush();
}

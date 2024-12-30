import { FlushMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { AppDataSource } from '../reuseables/orm';
import { logger, schedules } from '@trigger.dev/sdk/v3';
import { ProductJobUtils } from 'src/modules/data-ingestion/product.job.utils';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

export const CreateSafetySyncs = schedules.task({
    id: 'create-safety-syncs',
    cron: {
        pattern: '0 2 * * *',
        timezone: 'Europe/London',
    },
    machine: {
        preset: 'small-1x',
    },
    queue: {
        concurrencyLimit: 1,
    },
    run: async () => {
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
        await ProductJobUtils.scheduleTriggerJob(retailer, true, undefined, 'safetySync');
        retailer.lastSafetySyncRequested = new Date();
    }

    await em.flush();
}

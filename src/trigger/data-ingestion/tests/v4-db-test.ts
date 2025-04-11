import { logger, task } from '@trigger.dev/sdk';
import { IngestionQueue } from 'src/trigger/queues';

export const V4DBTest = task({
    id: 'v4-db-test',
    queue: IngestionQueue,
    machine: { preset: `medium-1x` },
    run: async (payload: Record<string, never>, { ctx }) => {
        logger.info('Payload');

        // if (!AppDataSource) {
        //     logger.error(`AppDataSource is not set`);
        //     throw new Error(`AppDataSource is not set`);
        // }

        // const em = AppDataSource.em.fork({
        //     flushMode: FlushMode.COMMIT,
        // });

        // const retailers = await em.findAll(RetailerEntity, { filters: false });

        // logger.info('db data', { retailers: retailers });
    },
});

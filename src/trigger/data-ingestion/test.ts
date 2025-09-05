import { logger, task, wait } from '@trigger.dev/sdk';
import { IngestionQueue } from 'src/trigger/queues';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { getDbForTrigger } from '../reuseables/db';

export const test = task({
    id: 'test',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
    run: async (payload: {}, { ctx }) => {
        logger.info('Payload', { data: JSON.stringify(payload) });

        const AppDataSource = getDbForTrigger();

        const retailer = await AppDataSource.find(RetailerEntity, {});

        logger.info(`Result: ${JSON.stringify(retailer)}`);

        const token = await wait.createToken({
            timeout: '10m', // you can optionally specify a timeout for the token
            tags: ['domain_csl.com', 'syncstep_products'],
            idempotencyKey: 'test2',
        });

        logger.info(`Token: ${JSON.stringify(token)}`);

        const result = await wait.forToken(token.id);

        if (result.ok) {
            logger.info('Wait for Token; token completed');
        } else {
            logger.info(`Token TTL hit. Token Expired.`);
        }
    },
});

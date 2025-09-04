import { BulkOperationStatus } from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { SyncStage } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { FlushMode } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { logger, task, wait } from '@trigger.dev/sdk';
import axios from 'axios';
import { createWriteStream, promises as fsPromises } from 'fs';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { ProductJobUtils } from 'src/modules/data-ingestion/product.job.utils';
import { IngestionQueue } from 'src/trigger/queues';
import { TriggerWaitForNobleReschedule, setDifference } from 'src/trigger/reuseables/noble_pollfills';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';
import { BulkOperationUtils } from '../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { GlobalIDUtils } from '../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../utils/JsonLUtils';
import { S3Utils } from '../../utils/S3Utils';
import { getDbForTrigger } from '../reuseables/db';

export const test = task({
    id: 'test',
    queue: IngestionQueue,
    machine: { preset: `small-2x` },
    run: async (payload: {}, { ctx }) => {
        logger.info('Payload', { data: JSON.stringify(payload) });

        const AppDataSource = getDbForTrigger();
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }

        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        const retailer = await em.find(RetailerEntity, {});

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

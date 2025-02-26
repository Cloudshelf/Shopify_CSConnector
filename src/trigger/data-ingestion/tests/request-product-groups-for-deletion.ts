import { FlushMode } from '@mikro-orm/core';
import { CloudshelfApiUtils } from '../../../modules/cloudshelf/cloudshelf.api.util';
import { BulkOperationType } from '../../../modules/data-ingestion/bulk.operation.type';
import { BulkOperationUtils } from '../../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { TriggerWaitForNobleReschedule } from '../../reuseables/noble_pollfills';
import { AppDataSource } from '../../reuseables/orm';
import { logger, task } from '@trigger.dev/sdk/v3';
import { subDays } from 'date-fns';

async function buildCollectionDeletionTriggerQueryPayload(): Promise<string> {
    return `{
        collections {
          edges {
            node {
              id
            }
          }
        }
      }`;
}

export const RequestProductGroupsForDeletionTask = task({
    id: 'request-product-groups-for-deletion',
    queue: {
        name: `ingestion`,
        concurrencyLimit: 1,
    },
    machine: {
        preset: 'small-1x',
    },
    run: async (payload: { organisationId: string }, { ctx }) => {
        logger.info('Payload', payload);
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }

        const cloudshelfAPI = process.env.CLOUDSHELF_API_URL;

        if (!cloudshelfAPI) {
            logger.error(`CLOUDSHELF_API_URL is not set`);
            throw new Error(`CLOUDSHELF_API_URL is not set`);
        }

        const connectorHost = process.env.SHOPIFY_CONNECTOR_HOST;

        if (!connectorHost) {
            logger.error(`SHOPIFY_CONNECTOR_HOST is not set`);
            throw new Error(`SHOPIFY_CONNECTOR_HOST is not set`);
        }

        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        const retailer = await em.findOne(RetailerEntity, { id: payload.organisationId });

        if (!retailer) {
            logger.error(`Retailer does not exist for id "${payload.organisationId}"`);
            throw new Error(`Retailer does not exist for id "${payload.organisationId}"`);
        }
        try {
            logger.info(
                `Requesting product groups for retailer ${retailer.displayName} (${retailer.id}) (${retailer.domain})`,
            );

            await TriggerWaitForNobleReschedule(retailer);

            logger.info(`Building query payload`);
            const queryPayload = await buildCollectionDeletionTriggerQueryPayload();

            logger.info(`Requesting bulk operation with payload`, { queryPayload });
            await BulkOperationUtils.requestBulkOperation(
                em,
                retailer,
                BulkOperationType.ProductGroupDeleteSync,
                queryPayload,
                false,
                {
                    info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
                },
            );
        } catch (err) {
            if (typeof err.message === 'string' && err.message.includes('status code 401')) {
                logger.warn('Ignoring ApolloError with status code 401 (Retailer uninstalled?)');
                retailer.syncErrorCode = '401';
                const input = {
                    storeClosed: true,
                };
                logger.info(`Reporting retailer closed.`, { input });
                await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
            } else if (typeof err.message === 'string' && err.message.includes('status code 402')) {
                logger.warn('Ignoring ApolloError with status code 402 (Retailer has outstanding shopify bill)');
                retailer.syncErrorCode = '402';
                const input = {
                    storeClosed: true,
                };
                logger.info(`Reporting retailer closed.`, { input });
                await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
            } else if (typeof err.message === 'string' && err.message.includes('status code 404')) {
                logger.warn('Ignoring ApolloError with status code 404 (Retailer Closed)');
                retailer.syncErrorCode = '404';
                const input = {
                    storeClosed: true,
                };
                logger.info(`Reporting retailer closed.`, { input });
                await CloudshelfApiUtils.reportCatalogStats(cloudshelfAPI, retailer.domain, input);
            } else {
                throw err;
            }
        } finally {
            logger.info(`Flushing changes to database`);
            await em.flush();
        }
    },
});

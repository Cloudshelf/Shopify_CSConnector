import { FlushMode } from '@mikro-orm/core';
import { BulkOperationType } from '../../../modules/data-ingestion/bulk.operation.type';
import { BulkOperationUtils } from '../../../modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { TriggerWaitForNobleReschedule } from '../../reuseables/noble_pollfills';
import { AppDataSource } from '../../reuseables/orm';
import { logger, task } from '@trigger.dev/sdk/v3';
import { subDays } from 'date-fns';

async function buildCollectionTriggerQueryPayload(retailer: RetailerEntity, changesSince?: Date): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    let queryString = '';

    if (changesSince !== undefined) {
        //we want to build an explicit query string
        queryString = `updated_at:>'${changesSince.toISOString()}'`;

        queryString = `(query: \"${queryString}\")`;
    }

    return `{
        collections${queryString}  {
          edges {
            node {
              id
              ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
              title
              handle
              image {
                url
              }
              storefrontId
              updatedAt
              products {
                edges {
                  node {
                    id
                    featuredImage {
                          url
                          id
                    }
                  }
                }
              }
            }
          }
        }
      }`;
}

export const RequestProductGroupsTask = task({
    id: 'request-product-groups',
    queue: {
        name: `ingestion`,
        concurrencyLimit: 1,
    },
    run: async (payload: { organisationId: string; fullSync: boolean }, { ctx }) => {
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

        logger.info(
            `Requesting product groups for retailer ${retailer.displayName} (${retailer.id}) (${retailer.domain})`,
        );

        await TriggerWaitForNobleReschedule(retailer);

        let changesSince: Date | undefined = undefined;
        if (!payload.fullSync) {
            changesSince = retailer.nextPartialSyncRequestTime ?? undefined;

            if (changesSince === undefined) {
                //If we have never don't a partial sync, lets just get the last days worth of changes...
                //This is just so we get something.
                changesSince = subDays(new Date(), 1);
            }

            retailer.lastPartialSyncRequestTime = changesSince;
        }

        logger.info(`Building query payload`);
        const queryPayload = await buildCollectionTriggerQueryPayload(retailer, changesSince);

        logger.info(`Requesting bulk operation with payload`, { queryPayload });
        await BulkOperationUtils.requestBulkOperation(
            em,
            retailer,
            BulkOperationType.ProductGroupSync,
            queryPayload,
            payload.fullSync,
            {
                info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
            },
        );

        logger.info(`Flushing changes to database`);
        await em.flush();
    },
});

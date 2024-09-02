import { BulkOperationStatus } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { logger, task } from '@trigger.dev/sdk/v3';
import { subDays, subMinutes } from 'date-fns';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { BulkOperationUtils } from 'src/modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { ToolsUtils } from 'src/modules/tools/tools.utils';
import { AppDataSource } from 'src/trigger/reuseables/orm';

async function buildProductTriggerQueryPayload(retailer: RetailerEntity, changesSince?: Date): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    let queryString = '';

    if (changesSince !== undefined) {
        //we want to build an explicit query string
        queryString = `updated_at:>'${changesSince.toISOString()}'`;

        queryString = `(query: \"${queryString}\")`;
    }

    return `{
          products${queryString} {
            edges {
              node {
                id
                featuredImage {
                  url
                  id
                }
                images {
                  edges {
                    node {
                      id
                      url
                    }
                  }
                }
                status
                ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
                storefrontId
                title
                descriptionHtml
                handle
                productType
                tags
                vendor
                totalVariants
                updatedAt
                metafields {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                      description
                      createdAt
                      updatedAt
                    }
                  }
                }
                variants {
                  edges {
                    node {
                      id
                      title
                      image {
                        id
                        url
                      }
                      price
                      sku
                      barcode
                      compareAtPrice
                      availableForSale
                      sellableOnlineQuantity
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }`;
}

export const RequestProductsTask = task({
    id: 'request-products',
    queue: {
        name: `ingestion`,
        concurrencyLimit: 1,
    },
    run: async (payload: { organisationId: string; fullSync: boolean }, { ctx }) => {
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

        logger.info(`Requesting products for retailer ${retailer.displayName} (${retailer.id}) (${retailer.domain})`);

        if (payload.fullSync) {
            logger.info(`payload.fullSync is true, registering webhooks`);
            //If its a full sync we register all the webhooks first, just to be safe.
            await ToolsUtils.registerAllWebhooksForRetailer(retailer, connectorHost, {
                info: logger.info,
                error: logger.error,
                warn: logger.warn,
            });
        }

        logger.info(`Checking for running bulk operation`);
        const currentBulkOperation = await BulkOperationUtils.checkForRunningBulkOperationByRetailer(retailer, {
            info: logger.info,
            error: logger.error,
            warn: logger.warn,
        });

        if (currentBulkOperation) {
            if (currentBulkOperation.status === BulkOperationStatus.Running) {
                logger.warn(
                    `Shopify is already running a bulk operation for this store. ${JSON.stringify(
                        currentBulkOperation,
                    )}`,
                );
                //TODO:trigger how to reschedule this task?
                // await this.nobleService.rescheduleTask(task, addSeconds(new Date(), 120));
                return;
            }
        }

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
        const queryPayload = await buildProductTriggerQueryPayload(retailer, changesSince);

        logger.info(`Requesting bulk operation with payload`, { queryPayload });
        await BulkOperationUtils.requestBulkOperation(
            em,
            retailer,
            BulkOperationType.ProductSync,
            queryPayload,
            payload.fullSync,
            {
                info: logger.info,
                error: logger.error,
                warn: logger.warn,
            },
        );

        retailer.nextPartialSyncRequestTime = subMinutes(new Date(), 1);

        logger.info(`Flushing changes to database`);
        await em.flush();
    },
});

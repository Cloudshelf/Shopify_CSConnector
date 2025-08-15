import { FlushMode } from '@mikro-orm/core';
import _ from 'lodash';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { getDbForTrigger } from '../reuseables/db';
import { ApiClient } from '@trigger.dev/core/v3';
import { logger, task } from '@trigger.dev/sdk';
import { CloudshelfApiStoreUtils } from 'src/modules/cloudshelf/cloudshelf.api.store.util';

export const ProvideCurrencyData = task({
    id: 'provideCurrencyData',
    queue: {
        name: `currency`,
        concurrencyLimit: 1,
    },
    machine: { preset: `medium-1x` },
    run: async (payload: Record<string, never>, { ctx }) => {
        logger.info('Payload', payload);

        const AppDataSource = getDbForTrigger();
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
        const cloudflarePublicEndpoint = process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
        if (!cloudflarePublicEndpoint) {
            logger.error(`CLOUDFLARE_R2_PUBLIC_ENDPOINT is not set`);
            throw new Error(`CLOUDFLARE_R2_PUBLIC_ENDPOINT is not set`);
        }
        const filePrefix = process.env.FILE_PREFIX;
        if (!filePrefix) {
            logger.error(`FILE_PREFIX is not set`);
            throw new Error(`FILE_PREFIX is not set`);
        }

        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        const retailers = await em.find(RetailerEntity, { currencyCode: { $ne: null } });

        for (const retailer of retailers) {
            logger.info(`Processing retailer ${retailer.domain} with currency ${retailer.currencyCode}`);

            // Skip if no currency code
            if (!retailer.currencyCode) {
                logger.warn(`No currency code for retailer ${retailer.domain}, skipping`);
                continue;
            }

            try {
                // Make API call to update currency
                await CloudshelfApiStoreUtils.upsertStore(cloudshelfAPI, retailer);

                logger.info(`Successfully updated currency for retailer ${retailer.domain}`);
            } catch (error) {
                logger.error(`Error updating currency for retailer ${retailer.domain}:`, {
                    error: JSON.stringify(error),
                });
            }
        }
    },
});

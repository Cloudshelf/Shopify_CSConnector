import { logger, task } from '@trigger.dev/sdk';
import { CloudshelfApiStoreUtils } from 'src/modules/cloudshelf/cloudshelf.api.store.util';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { getDbForTrigger, getEnvConfig } from '../reuseables/initialization';

export const ProvideCurrencyData = task({
    id: 'provideCurrencyData',
    queue: {
        name: `currency`,
        concurrencyLimit: 1,
    },
    machine: { preset: `medium-1x` },
    run: async (payload: Record<string, never>, { ctx }) => {
        logger.info('Payload', payload);

        const env = getEnvConfig();
        const AppDataSource = getDbForTrigger();

        const retailers = await AppDataSource.find(RetailerEntity, { currencyCode: { $ne: null } });

        for (const retailer of retailers) {
            logger.info(`Processing retailer ${retailer.domain} with currency ${retailer.currencyCode}`);

            // Skip if no currency code
            if (!retailer.currencyCode) {
                logger.warn(`No currency code for retailer ${retailer.domain}, skipping`);
                continue;
            }

            try {
                // Make API call to update currency
                await CloudshelfApiStoreUtils.upsertStore(env.CLOUDSHELF_API_URL, retailer);

                logger.info(`Successfully updated currency for retailer ${retailer.domain}`);
            } catch (error) {
                logger.error(`Error updating currency for retailer ${retailer.domain}:`, {
                    error: JSON.stringify(error),
                });
            }
        }
    },
});

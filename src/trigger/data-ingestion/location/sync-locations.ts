import { NestFactory } from '@nestjs/core';
import { ApolloQueryResult } from '@apollo/client';
import { LocationInput } from 'src/graphql/cloudshelf/generated/cloudshelf';
import {
    GetLocationsDocument,
    GetLocationsQuery,
    GetLocationsQueryVariables,
    LocationDetailsFragment,
} from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyGraphqlUtil } from 'src/modules/shopify/shopify.graphql.util';
import { FlushMode } from '@mikro-orm/core';
import { logger, task } from '@trigger.dev/sdk/v3';
import { CloudshelfApiUtils } from 'src/modules/cloudshelf/cloudshelf.api.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { AppDataSource } from 'src/trigger/reuseables/orm';
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { MiscellaneousUtils } from 'src/utils/MiscellaneousUtils';

export const SyncLocationsTask = task({
    id: 'sync-locations',
    queue: {
        name: `ingestion`,
        concurrencyLimit: 1,
    },
    run: async (payload: { organisationId: string }, { ctx }) => {
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }

        const cloudshelfAPI = process.env.CLOUDSHELF_API_URL;

        if (!cloudshelfAPI) {
            logger.error(`CLOUDSHELF_API_URL is not set`);
            throw new Error(`CLOUDSHELF_API_URL is not set`);
        }

        await new Promise(resolve => setTimeout(resolve, 10000));

        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        const retailer = await em.findOne(RetailerEntity, { id: payload.organisationId });

        if (!retailer) {
            logger.error(`Retailer does not exist for id "${payload.organisationId}"`);
            throw new Error(`Retailer does not exist for id "${payload.organisationId}"`);
        }

        let hasNextPage = true;
        let cursor: string | null = null;
        const shopifyLocationData: LocationDetailsFragment[] = [];
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

        do {
            const result: ApolloQueryResult<GetLocationsQuery> = await graphqlClient.query<
                GetLocationsQuery,
                GetLocationsQueryVariables
            >({
                query: GetLocationsDocument,
                variables: {
                    after: cursor,
                },
            });

            if (result.data.locations.edges) {
                for (const edge of result.data.locations.edges) {
                    if (edge?.node) {
                        shopifyLocationData.push(edge.node);
                    }
                }
            }

            if (result.error) {
                logger.error(`Query.Error: ${JSON.stringify(result.error)}`);
            }

            if (result.errors) {
                logger.error(`Query.Errors: ${JSON.stringify(result.errors)}`);
            }

            hasNextPage = result.data.locations.pageInfo.hasNextPage;
            cursor = result.data.locations.pageInfo.endCursor ?? null;
        } while (hasNextPage);

        if (!shopifyLocationData || shopifyLocationData.length === 0) {
            logger.warn('Shopify did not return any location data, we can end the job here.');
            return;
        }

        const locationInputs: LocationInput[] = [];

        for (const shopifyLocation of shopifyLocationData) {
            const csLocation: LocationInput = {
                id: GlobalIDUtils.gidConverter(shopifyLocation.id, 'ShopifyLocation'),
                displayName: shopifyLocation.name,
                address: shopifyLocation.address.formatted.join(', '),
                countryCode: MiscellaneousUtils.convertCountryCode(shopifyLocation.address.countryCode),
            };

            locationInputs.push(csLocation);
        }

        logger.info('Creating location in Cloudshelf with data:', { locationInputs });

        await CloudshelfApiUtils.upsertLocations(cloudshelfAPI, retailer, locationInputs, {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });
    },
});

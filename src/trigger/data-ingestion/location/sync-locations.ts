import { ApolloQueryResult } from '@apollo/client';
import { LocationInput } from '../../../graphql/cloudshelf/generated/cloudshelf';
import {
    GetLocationsDocument,
    GetLocationsQuery,
    GetLocationsQueryVariables,
    LocationDetailsFragment,
} from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyGraphqlUtil } from '../../../modules/shopify/shopify.graphql.util';
import { FlushMode } from '@mikro-orm/core';
import { logger, task, wait } from '@trigger.dev/sdk';
import { CloudshelfApiLocationUtils } from 'src/modules/cloudshelf/cloudshelf.api.location.util';
import { IngestionQueue } from 'src/trigger/queues';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { MiscellaneousUtils } from '../../../utils/MiscellaneousUtils';
import { getDbForTrigger, getEnvConfig } from '../../reuseables/initialization';

export const SyncLocationsTask = task({
    id: 'sync-locations',
    queue: IngestionQueue,
    machine: 'small-1x',
    run: async (payload: { organisationId: string }, { ctx }) => {
        const env = getEnvConfig();
        const AppDataSource = getDbForTrigger();

        await wait.for({ seconds: 10 });

        const retailer = await AppDataSource.findOne(RetailerEntity, { id: payload.organisationId });

        if (!retailer) {
            logger.error(`Retailer does not exist for id "${payload.organisationId}"`);
            throw new Error(`Retailer does not exist for id "${payload.organisationId}"`);
        }

        let hasNextPage = true;
        let cursor: string | null = null;
        const shopifyLocationData: LocationDetailsFragment[] = [];
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer({ retailer });

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

        await CloudshelfApiLocationUtils.upsertLocations(env.CLOUDSHELF_API_URL, retailer, locationInputs, {
            info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
        });
    },
});

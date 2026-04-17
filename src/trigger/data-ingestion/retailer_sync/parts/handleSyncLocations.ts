import { ApolloQueryResult } from '@apollo/client';
import { EntityManager } from '@mikro-orm/postgresql';
import { logger } from '@trigger.dev/sdk';
import { LocationInput } from 'src/graphql/cloudshelf/generated/cloudshelf';
import {
    GetLocationsDocument,
    GetLocationsQuery,
    GetLocationsQueryVariables,
    LocationDetailsFragment,
} from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { CloudshelfApiLocationUtils } from 'src/modules/cloudshelf/cloudshelf.api.location.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { ShopifyGraphqlUtil } from 'src/modules/shopify/shopify.graphql.util';
import { RetailerSyncEnvironmentConfig } from 'src/trigger/reuseables/env_validation';
import { GlobalIDUtils } from 'src/utils/GlobalIDUtils';
import { MiscellaneousUtils } from 'src/utils/MiscellaneousUtils';

export async function handleSyncLocations(
    env: RetailerSyncEnvironmentConfig,
    _appDataSource: EntityManager,
    retailer: RetailerEntity,
    _runId: string,
) {
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
        // address1 is required by the Cloudshelf API on create; fall back to 'unknown' so locations
        // without a street address in Shopify (rare, but possible) still sync instead of erroring.
        const csLocation: LocationInput = {
            id: GlobalIDUtils.gidConverter(shopifyLocation.id, 'ShopifyLocation'),
            displayName: shopifyLocation.name,
            address1: shopifyLocation.address?.address1 || 'unknown',
            address2: shopifyLocation.address?.address2 ?? null,
            city: shopifyLocation.address?.city ?? null,
            provinceCode: shopifyLocation.address?.provinceCode ?? null,
            zip: shopifyLocation.address?.zip ?? null,
            phone: shopifyLocation.address?.phone ?? null,
            countryCode: MiscellaneousUtils.convertCountryCode(shopifyLocation.address?.countryCode),
            fulfillsOnlineOrders: shopifyLocation.fulfillsOnlineOrders,
        };

        locationInputs.push(csLocation);
    }

    // Log a sanitized summary rather than the raw inputs — zip/phone/street
    // are PII we shouldn't persist in our log pipeline.
    logger.info('Creating locations in Cloudshelf', {
        count: locationInputs.length,
        locations: locationInputs.map(loc => ({
            id: loc.id,
            displayName: loc.displayName,
            countryCode: loc.countryCode,
            provinceCode: loc.provinceCode,
            city: loc.city,
            fulfillsOnlineOrders: loc.fulfillsOnlineOrders,
            hasAddress1: !!loc.address1 && loc.address1 !== 'unknown',
            hasZip: !!loc.zip,
            hasPhone: !!loc.phone,
        })),
    });

    await CloudshelfApiLocationUtils.upsertLocations(env.CLOUDSHELF_API_URL, retailer, locationInputs, {
        info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
        warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
        error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
    });
}


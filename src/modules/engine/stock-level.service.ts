import { Injectable, Logger } from '@nestjs/common';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import {
    StockViaProductVariantAllLocationsDocument,
    StockViaProductVariantAllLocationsQuery,
    StockViaProductVariantAllLocationsQueryVariables,
} from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { Telemetry } from 'src/decorators/telemetry';
import { RetailerEntity } from '../retailer/retailer.entity';

@Injectable()
export class StockLevelsService {
    private readonly logger = new Logger('StockLevelsService');

    @Telemetry('service.stock-levels.getStockLevels')
    async getStockLevels(
        retailer: RetailerEntity,
        variantId: string,
        productId: string | undefined,
        locationId: string | undefined,
    ): Promise<StockCheckResultPayload> {
        const result: StockCheckResultPayload = {
            dataType: 'StockLevels',
            dataTypeVersion: 1,
            responseFor: {
                variantId,
                productId: productId ?? null,
                locationId: locationId ?? null,
            },
            response: {
                totalNumberAvailable: 0,
                location: null,
                locations: [],
            },
        };

        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer({ retailer });

        const responseFromShopify = await graphqlClient.query<
            StockViaProductVariantAllLocationsQuery,
            StockViaProductVariantAllLocationsQueryVariables
        >({
            query: StockViaProductVariantAllLocationsDocument,
            variables: {
                variantId: variantId,
            },
        });

        if (
            !responseFromShopify.data ||
            !responseFromShopify.data.productVariant ||
            responseFromShopify.error ||
            responseFromShopify.errors
        ) {
            //return the empty result
            return result;
        }

        const productVariant = responseFromShopify.data.productVariant;
        result.responseFor.productId = productVariant.product.id;
        result.response.totalNumberAvailable = productVariant.inventoryQuantity ?? 0;
        result.response.locations = productVariant.inventoryItem.inventoryLevels.nodes.map(iLevel => {
            const numberAvailable = iLevel.quantities.reduce((acc, quantity) => {
                return acc + (quantity.quantity ?? 0);
            }, 0);

            return {
                id: iLevel.location.id,
                displayName: iLevel.location.name,
                numberAvailable: numberAvailable,
            };
        });

        if (locationId) {
            const matchingLocation = result.response.locations.find(location => location.id === locationId);
            if (matchingLocation) {
                result.response.location = matchingLocation;
            }
        }
        return result;
    }
}

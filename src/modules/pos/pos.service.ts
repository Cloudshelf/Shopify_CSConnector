import { Injectable, Logger } from '@nestjs/common';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import {
    GetDraftOrdersDocument,
    GetDraftOrdersQuery,
    GetDraftOrdersQueryVariables,
    StockViaProductVariantAllLocationsDocument,
    StockViaProductVariantAllLocationsQuery,
    StockViaProductVariantAllLocationsQueryVariables,
} from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfDraftOrder, CloudshelfDraftOrdersPayload } from './payloads/CloudshelfDraftOrdersPayload';

@Injectable()
export class POSService {
    private readonly logger = new Logger('POSService');

    @SentryInstrument('POSService')
    async getDraftOrders(
        retailer: RetailerEntity,
        search?: string,
        offset?: string,
    ): Promise<CloudshelfDraftOrdersPayload> {
        const result: CloudshelfDraftOrdersPayload = {
            items: [],
            pageInfo: { hasMore: false, nextPageCursor: undefined },
        };

        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);
        const queryParts: string[] = [];

        if (search) {
            queryParts.push(search);
        }
        queryParts.push("tag:'CLOUDSHELF_KIOSK_POS_TRANSFER'");
        const query = queryParts.join(' AND ');

        const responseFromShopify = await graphqlClient.query<GetDraftOrdersQuery, GetDraftOrdersQueryVariables>({
            query: GetDraftOrdersDocument,
            variables: {
                after: offset,
                query,
            },
        });

        if (
            !responseFromShopify.data ||
            !responseFromShopify.data.draftOrders ||
            responseFromShopify.error ||
            responseFromShopify.errors
        ) {
            //return the empty result
            return result;
        }

        result.pageInfo.hasMore = responseFromShopify.data.draftOrders.pageInfo.hasNextPage;
        result.pageInfo.nextPageCursor = responseFromShopify.data.draftOrders.pageInfo.endCursor ?? undefined;

        responseFromShopify.data.draftOrders.edges.map(edge => {
            const ordProps: {
                [key: string]: string;
            } = {};

            edge.node.customAttributes.map(custAtt => {
                if (custAtt.key && custAtt.value) {
                    ordProps[custAtt.key] = custAtt.value;
                }
            });

            const ord: CloudshelfDraftOrder = {
                id: edge.node.id,
                identifier: edge.node.name,
                email: edge.node.email ?? null,
                items: edge.node.lineItems.nodes.map(lineItemNode => {
                    const variantGid = lineItemNode.variant?.id;
                    const variantId = variantGid ? parseInt(variantGid.split('/').pop() ?? '0') : 0;

                    return {
                        variantId: variantId,
                        quantity: lineItemNode.quantity,
                    };
                }),
                properties: ordProps,
            };

            result.items.push({
                cursor: edge.cursor,
                node: ord,
            });
        });

        return result;
    }

    @SentryInstrument('StockLevelsService')
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

        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

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

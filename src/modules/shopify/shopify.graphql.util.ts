import { ApolloClient, InMemoryCache, NormalizedCacheObject, createHttpLink, from } from '@apollo/client/core';
import { graphqlDefaultOptions } from '../graphql/graphql.default.options';
import { RetailerEntity } from '../retailer/retailer.entity';
import { createShopifyRetryLink } from './throttling/shopify.throttling.error.link';

export class ShopifyGraphqlUtil {
    static async getShopifyAdminApolloClientByRetailer(retailer: RetailerEntity, logFn?: (s: string) => void) {
        return this.getShopifyAdminApolloClient(retailer.domain, retailer.accessToken, logFn);
    }

    static async getShopifyAdminApolloClient(
        domain: string,
        accessToken: string,
        logFn?: (s: string) => void,
    ): Promise<ApolloClient<NormalizedCacheObject>> {
        const endpoint = createHttpLink({
            uri: `https://${domain}/admin/api/2024-01/graphql.json`,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
            },
        });

        const rateLimit = createShopifyRetryLink(logFn);

        return new ApolloClient({
            cache: new InMemoryCache(),
            link: from([rateLimit, endpoint]),
            defaultOptions: graphqlDefaultOptions,
        });
    }

    static async getShopifyStorefrontApolloClientByRetailer(retailer: RetailerEntity) {
        if (!retailer.storefrontToken) {
            throw new Error('Storefront token is not defined');
        }
        return this.getShopifyStorefrontApolloClient(retailer.domain, retailer.storefrontToken);
    }

    static async getShopifyStorefrontApolloClient(domain: string, accessToken: string) {
        const endpoint = createHttpLink({
            uri: `https://${domain}/api/2024-01/graphql.json`,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': accessToken,
            },
        });

        return new ApolloClient({
            cache: new InMemoryCache(),
            link: from([endpoint]),
            defaultOptions: graphqlDefaultOptions,
        });
    }
}

import { ApolloClient, InMemoryCache, NormalizedCacheObject, createHttpLink, from } from '@apollo/client/core';
import { graphqlDefaultOptions } from '../graphql/graphql.default.options';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { createShopifyRetryLink } from './throttling/shopify.throttling.error.link';

export class ShopifyGraphqlUtil {
    static async getShopifyAdminApolloClientByRetailer(retailer: RetailerEntity, logs?: LogsInterface) {
        const domain = retailer.domain;
        const accessToken = retailer.accessToken;

        return this.getShopifyAdminApolloClient(domain, accessToken, logs);
    }

    static async getShopifyAdminApolloClient(
        domain: string,
        accessToken: string,
        logs?: LogsInterface,
    ): Promise<ApolloClient<NormalizedCacheObject>> {
        const endpoint = createHttpLink({
            uri: `https://${domain}/admin/api/2024-01/graphql.json`,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
            },
        });

        const rateLimit = createShopifyRetryLink(logs);

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

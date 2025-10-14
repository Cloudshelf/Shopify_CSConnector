import { ApolloClient, InMemoryCache, NormalizedCacheObject, createHttpLink, from } from '@apollo/client/core';
import { graphqlDefaultOptions } from '../graphql/graphql.default.options';
import { EntityManager } from '@mikro-orm/core';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { createShopifyRetryLink } from './throttling/shopify.retry.link';

export class ShopifyGraphqlUtil {
    static async getShopifyAdminApolloClientByRetailer({
        retailer,
        logs,
        em,
    }: {
        retailer: RetailerEntity;
        logs?: LogsInterface;
        em?: EntityManager;
    }) {
        const domain = retailer.domain;
        const accessToken = retailer.accessToken;

        return this.getShopifyAdminApolloClient({ domain, accessToken, logs });
    }

    static async getShopifyAdminApolloClient({
        domain,
        accessToken,
        logs,
    }: {
        domain: string;
        accessToken: string;
        logs?: LogsInterface;
    }): Promise<ApolloClient<NormalizedCacheObject>> {
        const endpoint = createHttpLink({
            uri: `https://${domain}/admin/api/2025-07/graphql.json`,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
            },
            fetchOptions: {
                timeout: 60000, // 60 seconds timeout for individual requests
            },
        });

        // Enhanced retry link handles both network errors and throttling
        const retryLink = createShopifyRetryLink({ logs });

        return new ApolloClient({
            cache: new InMemoryCache(),
            link: from([retryLink, endpoint]),
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
            uri: `https://${domain}/api/2025-07/graphql.json`,
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Storefront-Access-Token': accessToken,
            },
            fetchOptions: {
                timeout: 60000, // 60 seconds timeout for individual requests
            },
        });

        // Enhanced retry link for storefront API as well
        const retryLink = createShopifyRetryLink();

        return new ApolloClient({
            cache: new InMemoryCache(),
            link: from([retryLink, endpoint]),
            defaultOptions: graphqlDefaultOptions,
        });
    }
}

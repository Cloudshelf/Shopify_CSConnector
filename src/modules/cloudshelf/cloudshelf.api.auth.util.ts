import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    NormalizedCacheObject,
    createHttpLink,
    from,
} from '@apollo/client/core';
import { RetryLink } from '@apollo/client/link/retry';
import { graphqlDefaultOptions } from '../graphql/graphql.default.options';
import {
    ExchangeTokenDocument,
    ExchangeTokenQuery,
    ExchangeTokenQueryVariables,
} from 'src/graphql/cloudshelf/generated/cloudshelf';
import { CryptographyUtils } from '../../utils/CryptographyUtils';
import { LogsInterface } from './logs.interface';
import { createResponseLoggingLink } from './response.logging.link';

export class CloudshelfApiAuthUtils {
    private static clientCache: Map<string, ApolloClient<NormalizedCacheObject>> = new Map();

    private static getCacheKey(apiURL: string, domain?: string): string {
        return `${apiURL}:${domain || 'no-domain'}`;
    }

    static async getCloudshelfAPIApolloClient(
        apiURL: string,
        domain?: string,
        logs?: LogsInterface,
    ): Promise<ApolloClient<NormalizedCacheObject>> {
        const cacheKey = CloudshelfApiAuthUtils.getCacheKey(apiURL, domain);
        const cachedClient = CloudshelfApiAuthUtils.clientCache.get(cacheKey);

        if (cachedClient) {
            return cachedClient;
        }

        const httpLink = createHttpLink({
            uri: apiURL,
        });

        const authLink = new ApolloLink((operation, forward) => {
            const timestamp = new Date().getTime().toString();
            const vs = Object.keys(operation.variables ?? {})
                .sort()
                .reduce((obj, key) => {
                    obj[key] = operation.variables[key];
                    return obj;
                }, {} as any);
            const variables = JSON.stringify(vs);
            const hmac = domain ? CryptographyUtils.createHmac(domain + variables, timestamp) : '';

            operation.setContext(({ headers = {} }) => ({
                headers: {
                    ...headers,
                    ...(domain ? { 'x-store-domain': domain, 'x-hmac': hmac, 'x-nonce': timestamp } : {}),
                },
            }));

            return forward(operation);
        });

        const responseLoggingLink = createResponseLoggingLink(logs);
        const retryLink = new RetryLink({
            delay: {
                initial: 2000,
                max: Infinity,
                jitter: false,
            },
            attempts: {
                max: 3,
                retryIf: (error, _operation) => {
                    const status = (error as any)?.networkError?.statusCode ?? (error as any)?.statusCode;
                    return status === 502;
                },
            },
        });

        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: from([authLink, retryLink, responseLoggingLink, httpLink]),
            defaultOptions: graphqlDefaultOptions,
        });

        CloudshelfApiAuthUtils.clientCache.set(cacheKey, client);
        return client;
    }

    static async getCloudshelfAuthToken(
        apiURL: string,
        domain: string,
        logs?: LogsInterface,
    ): Promise<string | undefined> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, domain);
        const customTokenQuery = await authedClient.query<ExchangeTokenQuery, ExchangeTokenQueryVariables>({
            query: ExchangeTokenDocument,
            variables: {
                domain,
            },
        });

        if (customTokenQuery.errors || !customTokenQuery.data.customToken) {
            logs?.error?.(`Failed to get custom token for ${domain}`);
            return undefined;
        }

        return customTokenQuery.data.customToken;
    }

    static clearClientCache(apiUrl: string, domain?: string) {
        CloudshelfApiAuthUtils.clientCache.delete(CloudshelfApiAuthUtils.getCacheKey(apiUrl, domain));
    }
}

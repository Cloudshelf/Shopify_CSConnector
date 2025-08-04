import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    NormalizedCacheObject,
    createHttpLink,
    from,
} from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
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
            fetchOptions: {
                timeout: 30000, // 30 seconds timeout
            },
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

        const errorLink = onError(({ graphQLErrors, networkError }) => {
            // Log errors for debugging
            if (graphQLErrors) {
                graphQLErrors.forEach(({ message, locations, path }) =>
                    logs?.error?.(
                        `[CloudshelfApiAuthUtils] GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`,
                    ),
                );
            }

            if (networkError) {
                const statusCode = 'statusCode' in networkError ? (networkError as any).statusCode : undefined;
                logs?.error?.(
                    `[CloudshelfApiAuthUtils] Network error: ${networkError}${
                        statusCode ? ` (status: ${statusCode})` : ''
                    }`,
                );
            }
        });

        const responseLoggingLink = createResponseLoggingLink(logs);
        const retryLink = new RetryLink({
            delay: {
                initial: 1500,
                max: 5000,
                jitter: true,
            },
            attempts: {
                max: 5,
                retryIf: (error, _operation) => {
                    const status = (error as any)?.networkError?.statusCode ?? (error as any)?.statusCode;
                    // Retry on temporary errors
                    return [499, 502, 503, 504].includes(status);
                },
            },
        });

        const client = new ApolloClient({
            cache: new InMemoryCache(),
            link: from([authLink, errorLink, retryLink, responseLoggingLink, httpLink]),
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

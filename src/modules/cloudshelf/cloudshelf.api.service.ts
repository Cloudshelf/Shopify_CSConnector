import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    NormalizedCache,
    NormalizedCacheObject,
    createHttpLink,
    from,
} from '@apollo/client/core';
import {
    ExchangeTokenDocument,
    ExchangeTokenQuery,
    ExchangeTokenQueryVariables,
    UpsertStoreDocument,
    UpsertStoreMutation,
    UpsertStoreMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { CryptographyUtils } from '../../utils/CryptographyUtils';
import { cloudshelfSchema } from '../configuration/schemas/cloudshelf.schema';
import { RetailerEntity } from '../retailer/retailer.entity';

@Injectable()
export class CloudshelfApiService {
    private readonly logger = new Logger('CloudshelfApiService');

    constructor(private readonly configService: ConfigService<typeof cloudshelfSchema>) {}

    private async getCloudshelfAPIApolloClient(domain?: string): Promise<ApolloClient<NormalizedCacheObject>> {
        const httpLink = createHttpLink({
            uri: this.configService.get<string>('CLOUDSHELF_API_URL'),
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

        return new ApolloClient({
            cache: new InMemoryCache(),
            link: from([authLink, httpLink]),
            defaultOptions: {
                query: {
                    errorPolicy: 'all',
                },
                mutate: {
                    errorPolicy: 'all',
                },
            },
        });
    }

    async getCloudshelfAuthToken(domain: string): Promise<string | undefined> {
        const authedClient = await this.getCloudshelfAPIApolloClient(domain);
        const customTokenQuery = await authedClient.query<ExchangeTokenQuery, ExchangeTokenQueryVariables>({
            query: ExchangeTokenDocument,
            variables: {
                domain,
            },
        });

        if (customTokenQuery.errors || !customTokenQuery.data.customToken) {
            this.logger.error(`Failed to get custom token for ${domain}`);
            return undefined;
        }

        return customTokenQuery.data.customToken;
    }

    async upsertStore(retailer: RetailerEntity): Promise<void> {
        const timestamp = new Date().getTime().toString();
        const authedClient = await this.getCloudshelfAPIApolloClient(retailer.domain);
        const upsertStoreMutation = await authedClient.mutate<UpsertStoreMutation, UpsertStoreMutationVariables>({
            mutation: UpsertStoreDocument,
            variables: {
                input: {
                    domain: retailer.domain,
                    accessToken: retailer.accessToken,
                    scopes: retailer.scopes,
                    storefrontAccessToken: retailer.storefrontToken,
                },
                hmac: CryptographyUtils.createHmac(retailer.accessToken, timestamp),
                nonce: timestamp,
            },
        });

        if (upsertStoreMutation.errors) {
            this.logger.error(`Failed to upsert store ${retailer.domain}`);
            return;
        }
    }
}

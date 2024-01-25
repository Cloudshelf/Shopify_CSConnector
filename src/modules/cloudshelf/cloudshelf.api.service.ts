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
    CloudshelfInput,
    ExchangeTokenDocument,
    ExchangeTokenQuery,
    ExchangeTokenQueryVariables,
    LocationInput,
    MarkUninstalledDocument,
    MarkUninstalledMutation,
    MarkUninstalledMutationVariables,
    ProductGroupInput,
    ProductInput,
    ThemeInput,
    UpdateProductsInProductGroupDocument,
    UpdateProductsInProductGroupMutation,
    UpdateProductsInProductGroupMutationVariables,
    UpsertCloudshelfDocument,
    UpsertCloudshelfMutation,
    UpsertCloudshelfMutationVariables,
    UpsertLocationsDocument,
    UpsertLocationsMutation,
    UpsertLocationsMutationVariables,
    UpsertProductGroupsDocument,
    UpsertProductGroupsMutation,
    UpsertProductGroupsMutationVariables,
    UpsertProductVariantsDocument,
    UpsertProductVariantsMutation,
    UpsertProductVariantsMutationVariables,
    UpsertProductsDocument,
    UpsertProductsMutation,
    UpsertProductsMutationVariables,
    UpsertStoreDocument,
    UpsertStoreMutation,
    UpsertStoreMutationVariables,
    UpsertThemeDocument,
    UpsertThemeMutation,
    UpsertThemeMutationVariables,
    UpsertVariantsInput,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { graphqlDefaultOptions } from '../graphql/graphql.default.options';
import { CryptographyUtils } from '../../utils/CryptographyUtils';
import { cloudshelfSchema } from '../configuration/schemas/cloudshelf.schema';
import { RetailerEntity } from '../retailer/retailer.entity';
import { RetailerService } from '../retailer/retailer.service';
import { inspect } from 'util';

import retryTimes = jest.retryTimes;

@Injectable()
export class CloudshelfApiService {
    private readonly logger = new Logger('CloudshelfApiService');

    constructor(
        private readonly configService: ConfigService<typeof cloudshelfSchema>,
        private readonly retailerService: RetailerService,
    ) {}

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
            defaultOptions: graphqlDefaultOptions,
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

    async reportUninstall(domain: string): Promise<void> {
        const timestamp = new Date().getTime().toString();
        const authedClient = await this.getCloudshelfAPIApolloClient(domain);
        const reportUninstallMutation = await authedClient.mutate<
            MarkUninstalledMutation,
            MarkUninstalledMutationVariables
        >({
            mutation: MarkUninstalledDocument,
            variables: {
                input: {
                    domain,
                },
                hmac: CryptographyUtils.createHmac(domain, timestamp),
                nonce: timestamp,
            },
        });

        if (reportUninstallMutation.errors) {
            this.logger.error(`Failed to report uninstall ${domain}`);
            return;
        }
    }

    async upsertProducts(domain: string, input: ProductInput[], log?: (logmessage: string) => Promise<void>) {
        const authedClient = await this.getCloudshelfAPIApolloClient(domain);

        const mutationTuple = await authedClient.mutate<UpsertProductsMutation, UpsertProductsMutationVariables>({
            mutation: UpsertProductsDocument,
            variables: {
                input,
            },
        });

        //TODO: Handle errors
        if (mutationTuple.errors) {
            console.log('Failed to update products', mutationTuple.errors);

            await log?.('Failed to update products: ' + inspect(mutationTuple.errors));
        }
    }

    async upsertProductVariants(
        domain: string,
        inputs: UpsertVariantsInput[],
        log?: (logmessage: string) => Promise<void>,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(domain);

        const mutationTuple = await authedClient.mutate<
            UpsertProductVariantsMutation,
            UpsertProductVariantsMutationVariables
        >({
            mutation: UpsertProductVariantsDocument,
            variables: {
                inputs,
            },
        });

        //TODO: Handle errors
        if (mutationTuple.errors) {
            console.log('Failed to update product variants', mutationTuple.errors);

            await log?.('Failed to update product variants: ' + inspect(mutationTuple.errors));
        }
    }

    async updateProductGroups(domain: string, input: ProductGroupInput[], log?: (logmessage: string) => Promise<void>) {
        const authedClient = await this.getCloudshelfAPIApolloClient(domain);

        const mutationTuple = await authedClient.mutate<
            UpsertProductGroupsMutation,
            UpsertProductGroupsMutationVariables
        >({
            mutation: UpsertProductGroupsDocument,
            variables: {
                input,
            },
        });

        if (mutationTuple.errors) {
            console.log('Failed to update product groups', mutationTuple.errors);

            await log?.('Failed to update product groups: ' + inspect(mutationTuple.errors));
        }
        //TODO: Handle errors
    }

    async updateProductsInProductGroup(
        domain: string,
        productGroupId: string,
        productIds: string[],
        log?: (logMessage: string) => Promise<void>,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(domain);

        const mutationTuple = await authedClient.mutate<
            UpdateProductsInProductGroupMutation,
            UpdateProductsInProductGroupMutationVariables
        >({
            mutation: UpdateProductsInProductGroupDocument,
            variables: {
                productGroupId,
                productIds,
            },
        });

        if (mutationTuple.errors) {
            console.log('Failed to update products in group', mutationTuple.errors);
            await log?.('Failed to update products in group: ' + inspect(mutationTuple.errors));
        }
    }

    async createFirstCloudshelfIfRequired(retailer: RetailerEntity, log?: (logMessage: string) => Promise<void>) {
        //have we already created a cloudshelf? If not we need to

        if (retailer.generatedCloudshelfId !== null) {
            //we know we have already generated one
            return;
        }

        const firstCloudshelf: CloudshelfInput = {
            id: `gid://external/ConnectorGeneratedCloudshelf/${retailer.domain}`,
            randomContent: true,
            displayName: 'First Cloudshelf',
            homeFrameCallToAction: 'Touch to discover and buy',
        };

        const authedClient = await this.getCloudshelfAPIApolloClient(retailer.domain);
        const mutationTuple = await authedClient.mutate<UpsertCloudshelfMutation, UpsertCloudshelfMutationVariables>({
            mutation: UpsertCloudshelfDocument,
            variables: {
                input: [firstCloudshelf],
            },
        });

        if (mutationTuple.errors) {
            console.log('Failed to upsert Cloudshelf', mutationTuple.errors);
            await log?.('Failed to upsert cloudshelf: ' + inspect(mutationTuple.errors));
        }

        const upsertedResults = mutationTuple.data?.upsertCloudshelves.cloudshelves ?? [];

        if (upsertedResults.length === 0) {
            await log?.('Failed to upsert cloudshelf: ' + inspect(mutationTuple.errors));
        } else {
            const upsertedCloudshelf = upsertedResults[0];
            await log?.('Upserted cloudshelf: ' + inspect(upsertedCloudshelf));
            retailer.generatedCloudshelfId = upsertedCloudshelf.id;
            await this.retailerService.save(retailer);
        }
    }

    async createTheme(retailer: RetailerEntity, log?: (logMessage: string) => Promise<void>) {
        const authedClient = await this.getCloudshelfAPIApolloClient(retailer.domain);

        const themeInput: ThemeInput = {
            id: `gid://external/ConnectorGeneratedTheme/${retailer.domain}`,
            displayName: 'Default Theme',
            logoUrl: retailer.logoUrlFromShopify,
        };

        const mutationTuple = await authedClient.mutate<UpsertThemeMutation, UpsertThemeMutationVariables>({
            mutation: UpsertThemeDocument,
            variables: {
                input: themeInput,
            },
        });

        if (mutationTuple.errors) {
            await log?.('Failed to upsert theme: ' + inspect(mutationTuple.errors));
        }
    }

    async upsertLocations(
        retailer: RetailerEntity,
        input: LocationInput[],
        log?: (logMessage: string) => Promise<void>,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(retailer.domain);

        const mutationTuple = await authedClient.mutate<UpsertLocationsMutation, UpsertLocationsMutationVariables>({
            mutation: UpsertLocationsDocument,
            variables: {
                input,
            },
        });

        if (mutationTuple.errors) {
            console.log('Failed to upsert locations', mutationTuple.errors);
            await log?.('Failed to upsert locations: ' + inspect(mutationTuple.errors));
        }
    }
}

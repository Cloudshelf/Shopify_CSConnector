import { BooleanSchema } from 'joi';
import {
    ApolloClient,
    ApolloLink,
    InMemoryCache,
    NormalizedCacheObject,
    createHttpLink,
    from,
} from '@apollo/client/core';
import {
    CloudshelfInput,
    CurrencyCode,
    DeleteProductGroupsDocument,
    DeleteProductGroupsMutation,
    DeleteProductGroupsMutationVariables,
    DeleteProductsDocument,
    DeleteProductsMutation,
    DeleteProductsMutationVariables,
    ExchangeTokenDocument,
    ExchangeTokenQuery,
    ExchangeTokenQueryVariables,
    KeepKnownProductGroupsViaFileDocument,
    KeepKnownProductGroupsViaFileMutation,
    KeepKnownProductGroupsViaFileMutationVariables,
    KeepKnownProductsViaFileDocument,
    KeepKnownProductsViaFileMutation,
    KeepKnownProductsViaFileMutationVariables,
    KeepKnownVariantsViaFileDocument,
    KeepKnownVariantsViaFileMutation,
    KeepKnownVariantsViaFileMutationVariables,
    LocationInput,
    MarkUninstalledDocument,
    MarkUninstalledMutation,
    MarkUninstalledMutationVariables,
    OrderLineInput,
    OrderStatus,
    ProductGroupInput,
    ProductInput,
    ReportCatalogStatsDocument,
    ReportCatalogStatsMutation,
    ReportCatalogStatsMutationVariables,
    RequestShopifySubscriptionCheckDocument,
    RequestShopifySubscriptionCheckMutation,
    RequestShopifySubscriptionCheckMutationVariables,
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
    UpsertOrdersDocument,
    UpsertOrdersMutation,
    UpsertOrdersMutationVariables,
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
import { EntityManager } from '@mikro-orm/postgresql';
import { CryptographyUtils } from '../../utils/CryptographyUtils';
import { RetailerEntity } from '../retailer/retailer.entity';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiUtils {
    static async getCloudshelfAPIApolloClient(
        apiURL: string,
        domain?: string,
        logs?: LogsInterface,
    ): Promise<ApolloClient<NormalizedCacheObject>> {
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

            logs?.info?.('HMAC: ' + hmac);
            logs?.info?.('Nonce: ' + timestamp);
            logs?.info?.('Domain: ' + domain);
            logs?.info?.('Variables: ' + variables);

            return forward(operation);
        });

        return new ApolloClient({
            cache: new InMemoryCache(),
            link: from([authLink, httpLink]),
            defaultOptions: graphqlDefaultOptions,
        });
    }

    static async getCloudshelfAuthToken(
        apiURL: string,
        domain: string,
        logs?: LogsInterface,
    ): Promise<string | undefined> {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, domain);
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

    static async upsertStore(apiUrl: string, retailer: RetailerEntity, logs?: LogsInterface): Promise<void> {
        const timestamp = new Date().getTime().toString();
        const authedClient = await this.getCloudshelfAPIApolloClient(apiUrl, retailer.domain);

        let storeName = retailer.displayName ?? retailer.domain;
        if (storeName.toLowerCase().trim() === 'my store') {
            storeName = `${storeName} (${retailer.domain})`;
        }

        let curCodeToUse = CurrencyCode.Unknown;
        if (retailer.currencyCode !== null) {
            curCodeToUse = retailer.currencyCode as CurrencyCode;
        }
        const upsertStoreMutation = await authedClient.mutate<UpsertStoreMutation, UpsertStoreMutationVariables>({
            mutation: UpsertStoreDocument,
            variables: {
                input: {
                    domain: retailer.domain,
                    displayName: storeName,
                    accessToken: retailer.accessToken,
                    scopes: retailer.scopes,
                    storefrontAccessToken: retailer.storefrontToken,
                    defaultCurrencyCode: curCodeToUse,
                },
                hmac: CryptographyUtils.createHmac(retailer.accessToken, timestamp),
                nonce: timestamp,
            },
        });

        if (upsertStoreMutation.errors) {
            logs?.error?.(`Failed to upsert store ${retailer.domain}`);
            return;
        }
    }

    static async reportUninstall(apiUrl: string, domain: string, logs?: LogsInterface): Promise<void> {
        const timestamp = new Date().getTime().toString();
        const authedClient = await this.getCloudshelfAPIApolloClient(apiUrl, domain);
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
            logs?.error?.(`Failed to report uninstall ${domain}`);
            return;
        }
    }

    static async upsertProducts(apiUrl: string, domain: string, input: ProductInput[], logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiUrl, domain);

        const mutationTuple = await authedClient.mutate<UpsertProductsMutation, UpsertProductsMutationVariables>({
            mutation: UpsertProductsDocument,
            variables: {
                input,
            },
        });

        //TODO: Handle errors
        if (mutationTuple.errors) {
            logs?.error?.(`Failed to update products ${domain}`, { errors: mutationTuple.errors });
        }
    }

    static async upsertProductVariants(
        apiUrl: string,
        domain: string,
        inputs: UpsertVariantsInput[],
        logs?: LogsInterface,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiUrl, domain);

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
            logs?.error?.(`Failed to update product variants ${domain}`, { errors: mutationTuple.errors });
        }
    }

    static async updateProductGroups(apiUrl: string, domain: string, input: ProductGroupInput[], logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiUrl, domain);

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
            logs?.error?.(`Failed to update product groups ${domain}`, { errors: mutationTuple.errors });
        }
        //TODO: Handle errors
    }

    static async updateProductsInProductGroup(
        apiUrl: string,
        domain: string,
        productGroupId: string,
        productIds: string[],
        logs?: LogsInterface,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiUrl, domain);

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
            logs?.error?.(`Failed to update products in group ${domain}`, { errors: mutationTuple.errors });
        }
    }

    static async createFirstCloudshelfIfRequired(
        apiUrl: string,
        em: EntityManager,
        retailer: RetailerEntity,
        logs?: LogsInterface,
    ) {
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

        const authedClient = await this.getCloudshelfAPIApolloClient(apiUrl, retailer.domain);
        const mutationTuple = await authedClient.mutate<UpsertCloudshelfMutation, UpsertCloudshelfMutationVariables>({
            mutation: UpsertCloudshelfDocument,
            variables: {
                input: [firstCloudshelf],
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to upsert Cloudshelf ${retailer.domain}`, { errors: mutationTuple.errors });
        }

        const upsertedResults = mutationTuple.data?.upsertCloudshelves.cloudshelves ?? [];

        if (upsertedResults.length === 0) {
            logs?.error?.(`Failed to upsert cloudshelf ${retailer.domain}`, { errors: mutationTuple.errors });
        } else {
            const upsertedCloudshelf = upsertedResults[0];
            logs?.info?.(`Upserted cloudshelf: ${upsertedCloudshelf}`);
            retailer.generatedCloudshelfId = upsertedCloudshelf.id;
            em.persist(retailer);
            await em.flush();
        }
    }

    static async createTheme(apiURL: string, retailer: RetailerEntity, logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, retailer.domain);

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
            logs?.error?.(`Failed to upsert theme ${retailer.domain}`, { errors: mutationTuple.errors });
        }
    }

    static async upsertLocations(
        apiURL: string,
        retailer: RetailerEntity,
        input: LocationInput[],
        logs?: LogsInterface,
    ) {
        logs?.info?.(`Upserting locations for ${retailer.domain}`, { input });
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, retailer.domain);

        const mutationTuple = await authedClient.mutate<UpsertLocationsMutation, UpsertLocationsMutationVariables>({
            mutation: UpsertLocationsDocument,
            variables: {
                input,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to upsert locations ${retailer.domain}`, { errors: mutationTuple.errors });
        }

        if ((mutationTuple.data?.upsertLocations.userErrors ?? []).length > 0) {
            logs?.error?.(`Failed to upsert locations (userErrors) ${retailer.domain}`, {
                errors: mutationTuple.data?.upsertLocations.userErrors,
            });
        }

        logs?.info?.(`Result from API`, { data: mutationTuple.data });
    }

    static async deleteProductGroup(
        apiURL: string,
        retailer: RetailerEntity,
        productGroupId: string,
        logs?: LogsInterface,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, retailer.domain);

        const mutationTuple = await authedClient.mutate<
            DeleteProductGroupsMutation,
            DeleteProductGroupsMutationVariables
        >({
            mutation: DeleteProductGroupsDocument,
            variables: {
                ids: [productGroupId],
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to delete product group ${retailer.domain}`, { errors: mutationTuple.errors });
        }
    }

    static async deleteProduct(apiURL: string, retailer: RetailerEntity, productId: string, logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, retailer.domain);

        const mutationTuple = await authedClient.mutate<DeleteProductsMutation, DeleteProductsMutationVariables>({
            mutation: DeleteProductsDocument,
            variables: {
                ids: [productId],
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to delete product ${retailer.domain}`, { errors: mutationTuple.errors });
        }
    }

    static async requestSubscriptionCheck(apiURL: string, retailer: RetailerEntity, id: string, logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, retailer.domain);

        const mutationTuple = await authedClient.mutate<
            RequestShopifySubscriptionCheckMutation,
            RequestShopifySubscriptionCheckMutationVariables
        >({
            mutation: RequestShopifySubscriptionCheckDocument,
            variables: {
                shopifyGid: id,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to request subscription update ${retailer.domain}`, { errors: mutationTuple.errors });
        }
    }

    static async keepKnownProductsViaFile(apiURL: string, domain: string, url: string, logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, domain);

        const mutationTuple = await authedClient.mutate<
            KeepKnownProductsViaFileMutation,
            KeepKnownProductsViaFileMutationVariables
        >({
            mutation: KeepKnownProductsViaFileDocument,
            variables: {
                fileUrl: url,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to handle keepKnownProductsViaFile ${domain}`, { errors: mutationTuple.errors });
        }
    }

    static async keepKnownVariantsViaFile(apiURL: string, domain: string, url: string, logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, domain);

        const mutationTuple = await authedClient.mutate<
            KeepKnownVariantsViaFileMutation,
            KeepKnownVariantsViaFileMutationVariables
        >({
            mutation: KeepKnownVariantsViaFileDocument,
            variables: {
                fileUrl: url,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to handle keepKnownVariantsViaFile ${domain}`, { errors: mutationTuple.errors });
        }
    }

    static async keepKnownProductGroupsViaFile(apiURL: string, domain: string, url: string, logs?: LogsInterface) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, domain);

        const mutationTuple = await authedClient.mutate<
            KeepKnownProductGroupsViaFileMutation,
            KeepKnownProductGroupsViaFileMutationVariables
        >({
            mutation: KeepKnownProductGroupsViaFileDocument,
            variables: {
                fileUrl: url,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to handle keepKnownProductGroupsViaFile ${domain}`, { errors: mutationTuple.errors });
        }
    }

    static async reportCatalogStats(
        apiURL: string,
        domain: string,
        input: {
            knownNumberOfProductGroups?: number;
            knownNumberOfProducts?: number;
            knownNumberOfProductVariants?: number;
            knownNumberOfImages?: number;
            storeClosed?: boolean;
        },
        logs?: LogsInterface,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, domain, logs);

        const mutationTuple = await authedClient.mutate<
            ReportCatalogStatsMutation,
            ReportCatalogStatsMutationVariables
        >({
            mutation: ReportCatalogStatsDocument,
            variables: {
                knownNumberOfProductGroups: input.knownNumberOfProductGroups,
                knownNumberOfProducts: input.knownNumberOfProducts,
                knownNumberOfProductVariants: input.knownNumberOfProductVariants,
                knownNumberOfImages: input.knownNumberOfImages,
                retailerClosed: input.storeClosed,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to report catalog stats ${domain}`, { errors: mutationTuple.errors });
        }

        logs?.info?.(`reported stats :' + inspect(mutationTuple)`);
    }

    static async reportOrderStatus(
        apiURL: string,
        domain: string,
        shopifyCartId: string,
        status: OrderStatus,
        shopifyOrderId: string,
        fromPos: boolean,
        sessionId?: string,
        lines?: OrderLineInput[],
        logs?: LogsInterface,
    ) {
        const authedClient = await this.getCloudshelfAPIApolloClient(apiURL, domain);

        const mutationTuple = await authedClient.mutate<UpsertOrdersMutation, UpsertOrdersMutationVariables>({
            mutation: UpsertOrdersDocument,
            variables: {
                input: [
                    {
                        newThirdPartyId: shopifyOrderId,
                        thirdPartyId: shopifyCartId,
                        status: status,
                        lines: lines,
                        fromPOS: fromPos,
                        sessionId: sessionId,
                    },
                ],
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to report order status ${domain}`, { errors: mutationTuple.errors });
        }
    }
}

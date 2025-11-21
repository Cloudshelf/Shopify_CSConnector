import {
    DeleteProductGroupsDocument,
    DeleteProductGroupsMutation,
    DeleteProductGroupsMutationVariables,
    DeleteProductsDocument,
    DeleteProductsMutation,
    DeleteProductsMutationVariables,
    GetSyncStatsDocument,
    GetSyncStatsQuery,
    GetSyncStatsQueryVariables,
    KeepKnownProductGroupsViaFileDocument,
    KeepKnownProductGroupsViaFileMutation,
    KeepKnownProductGroupsViaFileMutationVariables,
    KeepKnownProductsViaFileDocument,
    KeepKnownProductsViaFileMutation,
    KeepKnownProductsViaFileMutationVariables,
    KeepKnownVariantsViaFileDocument,
    KeepKnownVariantsViaFileMutation,
    KeepKnownVariantsViaFileMutationVariables,
    ProductGroupInput,
    ProductGroupUpdateBatchItem,
    ProductInput,
    SyncStatsPayload,
    UpdateProductsInProductGroupDocument,
    UpdateProductsInProductGroupInBatchDocument,
    UpdateProductsInProductGroupInBatchMutation,
    UpdateProductsInProductGroupInBatchMutationVariables,
    UpdateProductsInProductGroupMutation,
    UpdateProductsInProductGroupMutationVariables,
    UpsertProductGroupsDocument,
    UpsertProductGroupsMutation,
    UpsertProductGroupsMutationVariables,
    UpsertProductVariantsDocument,
    UpsertProductVariantsMutation,
    UpsertProductVariantsMutationVariables,
    UpsertProductsDocument,
    UpsertProductsMutation,
    UpsertProductsMutationVariables,
    UpsertVariantsInput,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiProductUtils {
    static async upsertProducts(apiUrl: string, domain: string, input: ProductInput[], logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain, logs);

        const mutationTuple = await authedClient.mutate<UpsertProductsMutation, UpsertProductsMutationVariables>({
            mutation: UpsertProductsDocument,
            variables: {
                input,
            },
        });

        //TODO: Handle errors
        if (mutationTuple.errors) {
            logs?.error?.(`Failed to update products ${domain}`, { errors: JSON.stringify(mutationTuple.errors) });
        }
    }

    static async upsertProductVariants(
        apiUrl: string,
        domain: string,
        inputs: UpsertVariantsInput[],
        logs?: LogsInterface,
    ) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain, logs);

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
            logs?.error?.(`Failed to update product variants ${domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
        }
    }

    static async updateProductGroups(apiUrl: string, domain: string, input: ProductGroupInput[], logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain, logs);

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
            logs?.error?.(`Failed to update product groups ${domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
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
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain, logs);

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
            logs?.error?.(`Failed to update products in group ${domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
        }
    }

    static async updateProductsInProductGroupInBatches({
        apiUrl,
        domain,
        productGroupUpdateBatch,
        logs,
    }: {
        apiUrl: string;
        domain: string;
        productGroupUpdateBatch: ProductGroupUpdateBatchItem[];
        logs?: LogsInterface;
    }): Promise<{ success: boolean; productGroupId: string }[] | undefined> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain, logs);

        const mutationTuple = await authedClient.mutate<
            UpdateProductsInProductGroupInBatchMutation,
            UpdateProductsInProductGroupInBatchMutationVariables
        >({
            mutation: UpdateProductsInProductGroupInBatchDocument,
            variables: {
                productGroupUpdateBatchInput: {
                    productGroupUpdateBatch,
                },
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to update products in group ${domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
            return;
        }

        return mutationTuple.data?.updateProductsInProductGroupInBatch;
    }

    static async deleteProductGroup(
        apiURL: string,
        retailer: RetailerEntity,
        productGroupId: string,
        logs?: LogsInterface,
    ) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, retailer.domain, logs);

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
            logs?.error?.(`Failed to delete product group ${retailer.domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
        }
    }

    static async deleteProduct(apiURL: string, retailer: RetailerEntity, productId: string, logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, retailer.domain, logs);

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

    static async keepKnownProductsViaFile(apiURL: string, domain: string, url: string, logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, domain, logs);

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
            logs?.error?.(`Failed to handle keepKnownProductsViaFile ${domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
        }
    }

    static async keepKnownVariantsViaFile(apiURL: string, domain: string, url: string, logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, domain, logs);

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
            logs?.error?.(`Failed to handle keepKnownVariantsViaFile ${domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
        }
    }

    static async keepKnownProductGroupsViaFile(apiURL: string, domain: string, url: string, logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, domain, logs);

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
            logs?.error?.(`Failed to handle keepKnownProductGroupsViaFile ${domain}`, {
                errors: JSON.stringify(mutationTuple.errors),
            });
        }
    }

    static async getSyncStatsForShopify(
        apiURL: string,
        domain: string,
        logs?: LogsInterface,
    ): Promise<SyncStatsPayload | undefined> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, domain, logs);

        const queryTuple = await authedClient.query<GetSyncStatsQuery, GetSyncStatsQueryVariables>({
            query: GetSyncStatsDocument,
            variables: {
                storeDomain: domain,
            },
        });

        if (queryTuple.errors) {
            logs?.error?.(`Failed to get ingestion stats payload ${domain}`, {
                errors: JSON.stringify(queryTuple.errors),
            });
            return;
        }

        return {
            lastIngestionDataDate: queryTuple.data?.syncStatsToConnector?.lastIngestionDataDate,
            lastReportedCatalogStatsForImages: queryTuple.data?.syncStatsToConnector?.lastReportedCatalogStatsForImages,
            lastReportedCatalogStatsForProductGroups:
                queryTuple.data?.syncStatsToConnector?.lastReportedCatalogStatsForProductGroups,
            lastReportedCatalogStatsForProducts:
                queryTuple.data?.syncStatsToConnector?.lastReportedCatalogStatsForProducts,
            lastReportedCatalogStatsForVariants:
                queryTuple.data?.syncStatsToConnector?.lastReportedCatalogStatsForVariants,
            isClosed: queryTuple.data?.syncStatsToConnector?.isClosed,
        } as SyncStatsPayload;
    }
}

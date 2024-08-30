import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { cloudshelfSchema } from '../configuration/schemas/cloudshelf.schema';
import { RetailerEntity } from '../retailer/retailer.entity';
import { RetailerService } from '../retailer/retailer.service';
import { CloudshelfApiUtils, CloudshelfApiUtilsLogs } from './cloudshelf.api.util';
import { inspect } from 'util';

@Injectable()
export class CloudshelfApiService {
    private readonly logger = new Logger('CloudshelfApiService');

    constructor(
        private readonly configService: ConfigService<typeof cloudshelfSchema>,
        private readonly entityManager: EntityManager,
    ) {}

    async getCloudshelfAuthToken(domain: string): Promise<string | undefined> {
        return CloudshelfApiUtils.getCloudshelfAuthToken(this.configService.get<string>('CLOUDSHELF_API_URL')!, domain);
    }

    async upsertStore(retailer: RetailerEntity): Promise<void> {
        return CloudshelfApiUtils.upsertStore(this.configService.get<string>('CLOUDSHELF_API_URL')!, retailer);
    }

    async reportUninstall(domain: string): Promise<void> {
        return CloudshelfApiUtils.reportUninstall(this.configService.get<string>('CLOUDSHELF_API_URL')!, domain);
    }

    async upsertProducts(domain: string, input: ProductInput[], logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.upsertProducts(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            input,
            logs,
        );
    }

    async upsertProductVariants(domain: string, inputs: UpsertVariantsInput[], logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.upsertProductVariants(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            inputs,
            logs,
        );
    }

    async updateProductGroups(domain: string, input: ProductGroupInput[], logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.updateProductGroups(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            input,
            logs,
        );
    }

    async updateProductsInProductGroup(
        domain: string,
        productGroupId: string,
        productIds: string[],
        logs?: CloudshelfApiUtilsLogs,
    ) {
        return CloudshelfApiUtils.updateProductsInProductGroup(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            productGroupId,
            productIds,
            logs,
        );
    }

    async createFirstCloudshelfIfRequired(retailer: RetailerEntity, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.createFirstCloudshelfIfRequired(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            this.entityManager,
            retailer,
            logs,
        );
    }

    async createTheme(retailer: RetailerEntity, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.createTheme(this.configService.get<string>('CLOUDSHELF_API_URL')!, retailer, logs);
    }

    async upsertLocations(retailer: RetailerEntity, input: LocationInput[], logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.upsertLocations(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            input,
            logs,
        );
    }

    async deleteProductGroup(retailer: RetailerEntity, productGroupId: string, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.deleteProductGroup(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            productGroupId,
            logs,
        );
    }

    async deleteProduct(retailer: RetailerEntity, productId: string, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.deleteProduct(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            productId,
            logs,
        );
    }

    async requestSubscriptionCheck(retailer: RetailerEntity, id: string, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.requestSubscriptionCheck(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            id,
            logs,
        );
    }

    async keepKnownProductsViaFile(domain: string, url: string, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.keepKnownProductsViaFile(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            url,
            logs,
        );
    }

    async keepKnownVariantsViaFile(domain: string, url: string, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.keepKnownVariantsViaFile(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            url,
            logs,
        );
    }
    async keepKnownProductGroupsViaFile(domain: string, url: string, logs?: CloudshelfApiUtilsLogs) {
        return CloudshelfApiUtils.keepKnownProductGroupsViaFile(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            url,
            logs,
        );
    }

    async reportCatalogStats(
        domain: string,
        input: {
            knownNumberOfProductGroups?: number;
            knownNumberOfProducts?: number;
            knownNumberOfProductVariants?: number;
            knownNumberOfImages?: number;
            storeClosed?: boolean;
        },
        logs?: CloudshelfApiUtilsLogs,
    ) {
        return CloudshelfApiUtils.reportCatalogStats(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            input,
            logs,
        );
    }

    async reportOrderStatus(
        domain: string,
        shopifyCartId: string,
        status: OrderStatus,
        shopifyOrderId: string,
        lines?: OrderLineInput[],
        logs?: CloudshelfApiUtilsLogs,
    ) {
        return CloudshelfApiUtils.reportOrderStatus(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            shopifyCartId,
            status,
            shopifyOrderId,
            lines,
            logs,
        );
    }
}

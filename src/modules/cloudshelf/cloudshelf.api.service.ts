import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    LocationInput,
    OrderLineInput,
    OrderStatus,
    ProductGroupInput,
    ProductInput,
    UpsertVariantsInput,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/postgresql';
import { cloudshelfSchema } from '../configuration/schemas/cloudshelf.schema';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiUtils } from './cloudshelf.api.util';
import { LogsInterface } from './logs.interface';
import { from } from 'rxjs';

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

    async upsertProducts(domain: string, input: ProductInput[], logs?: LogsInterface) {
        return CloudshelfApiUtils.upsertProducts(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            input,
            logs,
        );
    }

    async upsertProductVariants(domain: string, inputs: UpsertVariantsInput[], logs?: LogsInterface) {
        return CloudshelfApiUtils.upsertProductVariants(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            inputs,
            logs,
        );
    }

    async updateProductGroups(domain: string, input: ProductGroupInput[], logs?: LogsInterface) {
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
        logs?: LogsInterface,
    ) {
        return CloudshelfApiUtils.updateProductsInProductGroup(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            productGroupId,
            productIds,
            logs,
        );
    }

    async createFirstCloudshelfIfRequired(retailer: RetailerEntity, logs?: LogsInterface) {
        return CloudshelfApiUtils.createFirstCloudshelfIfRequired(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            this.entityManager,
            retailer,
            logs,
        );
    }

    async createTheme(retailer: RetailerEntity, logs?: LogsInterface) {
        return CloudshelfApiUtils.createTheme(this.configService.get<string>('CLOUDSHELF_API_URL')!, retailer, logs);
    }

    async upsertLocations(retailer: RetailerEntity, input: LocationInput[], logs?: LogsInterface) {
        return CloudshelfApiUtils.upsertLocations(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            input,
            logs,
        );
    }

    async deleteProductGroup(retailer: RetailerEntity, productGroupId: string, logs?: LogsInterface) {
        return CloudshelfApiUtils.deleteProductGroup(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            productGroupId,
            logs,
        );
    }

    async deleteProduct(retailer: RetailerEntity, productId: string, logs?: LogsInterface) {
        return CloudshelfApiUtils.deleteProduct(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            productId,
            logs,
        );
    }

    async requestSubscriptionCheck(retailer: RetailerEntity, id: string, logs?: LogsInterface) {
        return CloudshelfApiUtils.requestSubscriptionCheck(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            retailer,
            id,
            logs,
        );
    }

    async keepKnownProductsViaFile(domain: string, url: string, logs?: LogsInterface) {
        return CloudshelfApiUtils.keepKnownProductsViaFile(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            url,
            logs,
        );
    }

    async keepKnownVariantsViaFile(domain: string, url: string, logs?: LogsInterface) {
        return CloudshelfApiUtils.keepKnownVariantsViaFile(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            url,
            logs,
        );
    }
    async keepKnownProductGroupsViaFile(domain: string, url: string, logs?: LogsInterface) {
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
        logs?: LogsInterface,
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
        fromPos: boolean,
        sessionId?: string,
        lines?: OrderLineInput[],
        logs?: LogsInterface,
    ) {
        return CloudshelfApiUtils.reportOrderStatus(
            this.configService.get<string>('CLOUDSHELF_API_URL')!,
            domain,
            shopifyCartId,
            status,
            shopifyOrderId,
            fromPos,
            sessionId,
            lines,
            logs,
        );
    }
}

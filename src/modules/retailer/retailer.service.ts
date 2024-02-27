import { Injectable, Logger } from '@nestjs/common';
import {
    UpdateLastSyncDocument,
    UpdateLastSyncMutation,
    UpdateLastSyncMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import {
    GetThemeInformationDocument,
    GetThemeInformationQuery,
    GetThemeInformationQueryVariables,
} from '../../graphql/shopifyStorefront/generated/shopifyStorefront';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { app } from '../../main';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../cloudshelf/cloudshelf.api.service';
import { UpdateOrCreateStatusType } from '../database/update.or.create.status.type';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';
import { RetailerEntity } from './retailer.entity';
import { Shopify, ShopifyRestResources } from '@shopify/shopify-api';
import { inspect } from 'util';

@Injectable()
export class RetailerService {
    private readonly logger = new Logger('RetailerService');

    constructor(
        private readonly entityManager: EntityManager,
        private readonly cloudshelfApiService: CloudshelfApiService,
    ) {}

    @SentryInstrument('RetailerService')
    async updateOrCreate(
        domain: string,
        accessToken: string,
        scopesString: string,
    ): Promise<{ entity: RetailerEntity; status: UpdateOrCreateStatusType }> {
        this.logger.log(`findOrCreate: ${domain}`);
        let status: UpdateOrCreateStatusType = 'noChange';
        let shop = await this.entityManager.findOne(RetailerEntity, { domain });
        const scopesArray = scopesString.split(',') ?? [];

        if (shop) {
            if (shop.accessToken !== accessToken || shop.scopes !== scopesArray) {
                status = 'updated';
            }
            shop = this.entityManager.assign(shop, { accessToken, scopes: scopesArray });
        } else {
            const now = new Date();
            shop = this.entityManager.create(RetailerEntity, {
                domain,
                accessToken,
                scopes: scopesArray,
                createdAt: now,
                updatedAt: now,
            });
            status = 'created';
        }

        await this.entityManager.persistAndFlush(shop);
        return { entity: shop, status };
    }

    @SentryInstrument('RetailerService')
    async existsByDomain(domain: string): Promise<boolean> {
        return !!(await this.entityManager.findOne(RetailerEntity, { domain }));
    }

    @SentryInstrument('RetailerService')
    async deleteByDomain(domain: string): Promise<boolean> {
        const retailer = await this.entityManager.findOne(RetailerEntity, { domain });
        if (!!retailer) {
            await this.entityManager.removeAndFlush(retailer);
            return true;
        }

        return false;
    }

    @SentryInstrument('RetailerService')
    async getSharedSecret(domain: string): Promise<string | undefined> {
        let em = this.entityManager;

        if (em === undefined) {
            const orm = app!.get(MikroORM);
            em = orm.em.fork();
        }

        const shop = await em.findOne(RetailerEntity, { domain });

        if (!shop) {
            return undefined;
        }

        return shop.sharedSecret ?? undefined;
    }

    @SentryInstrument('RetailerService')
    async save(entity: RetailerEntity) {
        await this.entityManager.persistAndFlush(entity);
    }

    @SentryInstrument('RetailerService')
    getById(organisationId: string) {
        return this.entityManager.findOne(RetailerEntity, { id: organisationId });
    }

    @SentryInstrument('RetailerService')
    async getByDomain(domain: string) {
        return this.entityManager.findOne(RetailerEntity, { domain });
    }

    async updateLastProductSyncTime(retailer: RetailerEntity, didError: boolean) {
        retailer.lastProductSync = new Date();
        await this.entityManager.persistAndFlush(retailer);
        await this.updateSyncTime(retailer, 'partial', true, didError);
    }

    async updateLastProductGroupSyncTime(retailer: RetailerEntity, didError: boolean) {
        retailer.lastProductGroupSync = new Date();
        await this.entityManager.persistAndFlush(retailer);
        await this.updateSyncTime(retailer, 'partial', true, didError);
    }

    async updateLastSafetySyncTime(retailer: RetailerEntity, didError: boolean) {
        retailer.lastSafetySync = new Date();
        await this.entityManager.persistAndFlush(retailer);
        await this.updateSyncTime(retailer, 'full', true, didError);
    }

    async updateShopInformationFromShopify(
        shopifyApiInstance: Shopify,
        entity: RetailerEntity,
        session: ShopifySessionEntity,
    ) {
        let storeName = 'Unknown';
        let email = 'Unknown';
        let currency = 'Unknown';

        try {
            const shopData = await (shopifyApiInstance.rest as ShopifyRestResources).Shop.all({
                session: session,
            });

            if (shopData.data.length >= 1) {
                storeName = shopData.data[0].name ?? 'Unknown';
                email = shopData.data[0].email ?? 'Unknown';
                currency = shopData.data[0].currency ?? 'Unknown';
            }

            entity.displayName = storeName;
            entity.email = email;
            entity.currencyCode = currency;
        } catch (e) {
            this.logger.error(e);
        }

        await this.save(entity);
        return entity;
    }

    async updateLogoFromShopify(retailer: RetailerEntity, log?: (message: string) => Promise<void>) {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyStorefrontApolloClientByRetailer(retailer);

        const query = await graphqlClient.query<GetThemeInformationQuery, GetThemeInformationQueryVariables>({
            query: GetThemeInformationDocument,
        });

        if (query.error) {
            await log?.('Query.Error: ' + JSON.stringify(query.error));
        }

        if (query.errors) {
            await log?.('Query.Errors: ' + JSON.stringify(query.errors));
        }

        retailer.logoUrlFromShopify = query.data.shop.brand?.logo?.image?.url ?? null;
        await this.save(retailer);
        return retailer;
    }

    async getAll(from: number, limit: number) {
        return this.entityManager.find(RetailerEntity, {}, { limit, offset: from });
    }

    async updateSyncTime(
        retailer: RetailerEntity,
        syncType: 'full' | 'partial',
        completed: boolean,
        didError?: boolean,
        log?: (logMessage: string) => Promise<void>,
    ) {
        const authedClient = await this.cloudshelfApiService.getCloudshelfAPIApolloClient(retailer.domain);

        const mutationTuple = await authedClient.mutate<UpdateLastSyncMutation, UpdateLastSyncMutationVariables>({
            mutation: UpdateLastSyncDocument,
            variables: {
                fullSync: syncType === 'full',
                completed,
                didError,
            },
        });

        if (mutationTuple.errors) {
            console.log('Failed to update sync time', mutationTuple.errors);
            await log?.('Failed to update sync time' + inspect(mutationTuple.errors));
        } else {
            await log?.('Updated sync time');
        }
    }
}

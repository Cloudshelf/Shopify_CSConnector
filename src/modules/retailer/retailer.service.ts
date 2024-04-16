import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
    BulkOperationByShopifyIdDocument,
    BulkOperationByShopifyIdQuery,
    BulkOperationByShopifyIdQueryVariables,
    GetShopInformationDocument,
    GetShopInformationQuery,
    GetShopInformationQueryVariables,
} from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import {
    GetThemeInformationDocument,
    GetThemeInformationQuery,
    GetThemeInformationQueryVariables,
} from '../../graphql/shopifyStorefront/generated/shopifyStorefront';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import { CreateRequestContext, EntityManager, MikroORM } from '@mikro-orm/core';
import { app } from '../../main';
import { NotificationUtils } from '../../utils/NotificationUtils';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { UpdateOrCreateStatusType } from '../database/update.or.create.status.type';
import { SlackService } from '../integrations/slack.service';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';
import { RetailerEntity } from './retailer.entity';
import { Shopify, ShopifyRestResources } from '@shopify/shopify-api';

@Injectable()
export class RetailerService {
    private readonly logger = new Logger('RetailerService');

    constructor(
        //orm is required by CreateRequestContext
        private readonly orm: MikroORM,
        private readonly entityManager: EntityManager,
        private readonly slackService: SlackService,
    ) {}

    @Cron('0 6 * * *', { name: 'retailer-sync-check', timeZone: 'Europe/London' })
    async syncCheckCron() {
        await this.checkAndReportSyncIssues();
    }

    @CreateRequestContext()
    async checkAndReportSyncIssues() {
        //find any retailers where the lastSafetySyncCompleted was more than 48 hours ago (or its null) AND there is not a sync error code
        const retailers = await this.entityManager.find(RetailerEntity, {
            $or: [
                {
                    lastSafetySyncCompleted: {
                        $lt: new Date(Date.now() - 48 * 60 * 60 * 1000),
                    },
                },
                {
                    lastSafetySyncCompleted: {
                        $eq: null,
                    },
                },
            ],
            syncErrorCode: { $eq: null },
        });

        const data = retailers.map(r => {
            return { displayName: r.displayName ?? r.domain, url: r.domain };
        });

        if (data.length > 0) {
            await this.slackService.sendHealthNotification(NotificationUtils.buildSyncIssueNotifications(data));
        }
    }

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

    async updateLastProductSyncTime(retailer: RetailerEntity) {
        retailer.lastProductSync = new Date();
        await this.entityManager.persistAndFlush(retailer);
    }

    async updateLastProductGroupSyncTime(retailer: RetailerEntity) {
        retailer.lastProductGroupSync = new Date();
        await this.entityManager.persistAndFlush(retailer);
    }

    async updateLastSafetyRequestedTime(retailer: RetailerEntity) {
        retailer.lastSafetySyncRequested = new Date();
        await this.entityManager.persistAndFlush(retailer);
    }

    async updateLastSafetyCompletedTime(retailer: RetailerEntity) {
        retailer.lastSafetySyncCompleted = new Date();
        await this.entityManager.persistAndFlush(retailer);
    }

    async updateShopInformationFromShopifyOnlineSession(
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

            if (storeName.toLowerCase().trim() === 'my store') {
                storeName = `${storeName} (${entity.domain})`;
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

    async updateShopInformationFromShopifyGraphql(retailer: RetailerEntity, log?: (message: string) => Promise<void>) {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClient(
            retailer.domain,
            retailer.accessToken,
            log,
        );

        const query = await graphqlClient.query<GetShopInformationQuery, GetShopInformationQueryVariables>({
            query: GetShopInformationDocument,
        });

        if (query.error) {
            await log?.('Query.Error: ' + JSON.stringify(query.error));
        }

        if (query.errors) {
            await log?.('Query.Errors: ' + JSON.stringify(query.errors));
        }

        let name = query.data.shop.name;

        if (name.toLowerCase().trim() === 'my store') {
            name = `${name} (${retailer.domain})`;
        }
        retailer.displayName = query.data.shop.name;
        retailer.email = query.data.shop.email;
        retailer.currencyCode = query.data.shop.currencyCode;

        await this.save(retailer);
        return retailer;
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
}

import {
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
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { app } from '../../main';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { UpdateOrCreateStatusType } from '../database/update.or.create.status.type';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';
import { RetailerEntity } from './retailer.entity';
import { Shopify, ShopifyRestResources } from '@shopify/shopify-api';
import { Telemetry } from 'src/decorators/telemetry';

export class RetailerUtils {
    @Telemetry('utils.retailer.updateOrCreate')
    static async updateOrCreate(
        em: EntityManager,
        domain: string,
        accessToken: string,
        scopesString: string,
        logs?: LogsInterface,
    ): Promise<{ entity: RetailerEntity; status: UpdateOrCreateStatusType }> {
        logs?.info(`findOrCreate: ${domain}`);
        let status: UpdateOrCreateStatusType = 'noChange';
        let shop = await em.findOne(RetailerEntity, { domain });
        const scopesArray = scopesString.split(',') ?? [];

        if (shop) {
            if (shop.accessToken !== accessToken || shop.scopes !== scopesArray) {
                status = 'updated';
            }
            shop = em.assign(shop, { accessToken, scopes: scopesArray });
        } else {
            const now = new Date();
            shop = em.create(RetailerEntity, {
                domain,
                accessToken,
                scopes: scopesArray,
                createdAt: now,
                updatedAt: now,
            });
            status = 'created';
        }

        await em.persistAndFlush(shop);
        return { entity: shop, status };
    }

    @Telemetry('utils.retailer.existsByDomain')
    static async existsByDomain(em: EntityManager, domain: string): Promise<boolean> {
        return !!(await em.findOne(RetailerEntity, { domain }));
    }

    @Telemetry('utils.retailer.deleteByDomain')
    static async deleteByDomain(em: EntityManager, domain: string): Promise<boolean> {
        const retailer = await em.findOne(RetailerEntity, { domain });
        if (!!retailer) {
            await em.removeAndFlush(retailer);
            return true;
        }

        return false;
    }

    @Telemetry('utils.retailer.getSharedSecret')
    static async getSharedSecret(em: EntityManager, domain: string): Promise<string | undefined> {
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

    @Telemetry('utils.retailer.save')
    static async save(em: EntityManager, entity: RetailerEntity) {
        await em.persistAndFlush(entity);
    }

    @Telemetry('utils.retailer.getById')
    static getById(em: EntityManager, organisationId: string) {
        return em.findOne(RetailerEntity, { id: organisationId });
    }

    @Telemetry('utils.retailer.getByDomain')
    static async getByDomain(em: EntityManager, domain: string) {
        return em.findOne(RetailerEntity, { domain });
    }

    @Telemetry('utils.retailer.updateShopInformationFromShopifyOnlineSession')
    static async updateShopInformationFromShopifyOnlineSession(
        em: EntityManager,
        shopifyApiInstance: Shopify,
        entity: RetailerEntity,
        session: ShopifySessionEntity,
        logs?: LogsInterface,
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
            logs?.error(e);
        }

        await RetailerUtils.save(em, entity);
        return entity;
    }

    @Telemetry('utils.retailer.updateShopInformationFromShopifyGraphql')
    static async updateShopInformationFromShopifyGraphql(
        em: EntityManager,
        retailer: RetailerEntity,
        logs?: LogsInterface,
    ) {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClient(
            retailer.domain,
            retailer.accessToken,
            logs,
        );

        const query = await graphqlClient.query<GetShopInformationQuery, GetShopInformationQueryVariables>({
            query: GetShopInformationDocument,
        });

        if (query.error) {
            await logs?.error('Query.Error: ' + JSON.stringify(query.error));
        }

        if (query.errors) {
            await logs?.error('Query.Errors: ' + JSON.stringify(query.errors));
        }

        let name = query.data.shop.name;

        if (name.toLowerCase().trim() === 'my store') {
            name = `${name} (${retailer.domain})`;
        }
        retailer.displayName = query.data.shop.name;
        retailer.email = query.data.shop.email;
        retailer.currencyCode = query.data.shop.currencyCode;

        await RetailerUtils.save(em, retailer);
        return retailer;
    }

    @Telemetry('utils.retailer.updateLogoFromShopify')
    static async updateLogoFromShopify(em: EntityManager, retailer: RetailerEntity, logs?: LogsInterface) {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyStorefrontApolloClientByRetailer(retailer);

        const query = await graphqlClient.query<GetThemeInformationQuery, GetThemeInformationQueryVariables>({
            query: GetThemeInformationDocument,
        });

        if (query.error) {
            await logs?.error('Query.Error: ' + JSON.stringify(query.error));
        }

        if (query.errors) {
            await logs?.error('Query.Errors: ' + JSON.stringify(query.errors));
        }

        retailer.logoUrlFromShopify = query.data.shop.brand?.logo?.image?.url ?? null;
        await RetailerUtils.save(em, retailer);
        return retailer;
    }

    @Telemetry('utils.retailer.getAll')
    static async getAll(em: EntityManager, from: number, limit: number) {
        return em.find(RetailerEntity, {}, { limit, offset: from });
    }
}

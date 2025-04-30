import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { UpdateOrCreateStatusType } from '../database/update.or.create.status.type';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';
import { RetailerEntity } from './retailer.entity';
import { RetailerUtils } from './retailer.utils';
import { Shopify } from '@shopify/shopify-api';

@Injectable()
export class RetailerService {
    private readonly logger = new Logger('RetailerService');

    constructor(private readonly entityManager: EntityManager) {}
    @SentryInstrument('RetailerService')
    findOneByStorefrontToken(authToken: string) {
        return this.entityManager.findOne(RetailerEntity, { storefrontToken: authToken }, { filters: false });
    }

    @SentryInstrument('RetailerService')
    findOneByDomain(domain: string) {
        return this.entityManager.findOne(RetailerEntity, { domain: domain }, { filters: false });
    }

    @SentryInstrument('RetailerService')
    async updateOrCreate(
        domain: string,
        accessToken: string,
        scopesString: string,
    ): Promise<{ entity: RetailerEntity; status: UpdateOrCreateStatusType }> {
        return RetailerUtils.updateOrCreate(this.entityManager, domain, accessToken, scopesString);
    }

    @SentryInstrument('RetailerService')
    async existsByDomain(domain: string): Promise<boolean> {
        return RetailerUtils.existsByDomain(this.entityManager, domain);
    }

    @SentryInstrument('RetailerService')
    async deleteByDomain(domain: string): Promise<boolean> {
        return RetailerUtils.deleteByDomain(this.entityManager, domain);
    }

    @SentryInstrument('RetailerService')
    async getSharedSecret(domain: string): Promise<string | undefined> {
        return RetailerUtils.getSharedSecret(this.entityManager, domain);
    }

    @SentryInstrument('RetailerService')
    async save(entity: RetailerEntity) {
        return await RetailerUtils.save(this.entityManager, entity);
    }

    @SentryInstrument('RetailerService')
    getById(organisationId: string) {
        return RetailerUtils.getById(this.entityManager, organisationId);
    }

    @SentryInstrument('RetailerService')
    async getByDomain(domain: string) {
        return RetailerUtils.getByDomain(this.entityManager, domain);
    }

    async updateShopInformationFromShopifyOnlineSession(
        shopifyApiInstance: Shopify,
        entity: RetailerEntity,
        session: ShopifySessionEntity,
    ) {
        return await RetailerUtils.updateShopInformationFromShopifyOnlineSession(
            this.entityManager,
            shopifyApiInstance,
            entity,
            session,
        );
    }

    async updateShopInformationFromShopifyGraphql(retailer: RetailerEntity, logs?: LogsInterface) {
        return await RetailerUtils.updateShopInformationFromShopifyGraphql(this.entityManager, retailer, logs);
    }

    async updateLogoFromShopify(retailer: RetailerEntity, logs?: LogsInterface) {
        return RetailerUtils.updateLogoFromShopify(this.entityManager, retailer, logs);
    }

    async getAll(from: number, limit: number) {
        return RetailerUtils.getAll(this.entityManager, from, limit);
    }
}

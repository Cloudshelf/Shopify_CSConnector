import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { DateUtils } from '../../utils/DateUtils';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { UpdateOrCreateStatusType } from '../database/update.or.create.status.type';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';
import { RetailerEntity } from './retailer.entity';

@Injectable()
export class RetailerService {
    private readonly logger = new Logger('RetailerService');

    constructor(private readonly entityManager: EntityManager) {}

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
        const shop = await this.entityManager.findOne(RetailerEntity, { domain });

        if (!shop) {
            return undefined;
        }

        return shop.sharedSecret ?? undefined;
    }
}

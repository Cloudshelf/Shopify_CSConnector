import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { DateUtils } from '../../utils/DateUtils';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { RetailerEntity } from './retailer.entity';

@Injectable()
export class RetailerService {
    private readonly logger = new Logger('RetailerService');

    constructor(private readonly entityManager: EntityManager) {}

    @SentryInstrument('RetailerService')
    async findOrCreate(domain: string, accessToken: string, scopesString: string): Promise<RetailerEntity> {
        this.logger.log(`findOrCreate: ${domain}`);
        let shop = await this.entityManager.findOne(RetailerEntity, { domain });
        const scopesArray = scopesString.split(',') ?? [];

        if (shop) {
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
        }

        await this.entityManager.persistAndFlush(shop);
        return shop;
    }

    @SentryInstrument('RetailerService')
    async existsByDomain(domain: string): Promise<boolean> {
        return !!(await this.entityManager.findOne(RetailerEntity, { domain }));
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

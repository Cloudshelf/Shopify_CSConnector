import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { ShopifySessionEntity } from './shopify.session.entity';
import { SessionStorage } from '@nestjs-shopify/core';

@Injectable()
export class DatabaseSessionStorage implements SessionStorage {
    private readonly logger = new ExtendedLogger('DatabaseSessionStorage');

    constructor(private readonly entityManager: EntityManager) {}

    @SentryInstrument('DatabaseSessionStorage')
    async storeSession(session: ShopifySessionEntity): Promise<boolean> {
        let entity = await this.loadSession(session.id);

        if (!entity) {
            entity = this.entityManager.create(ShopifySessionEntity, session);
        } else {
            entity = this.entityManager.assign(entity, session);
        }

        try {
            await this.entityManager.persistAndFlush(entity);
            return true;
        } catch (err) {
            this.logger.error(err);
        }

        return false;
    }

    @SentryInstrument('DatabaseSessionStorage')
    async loadSession(id: string): Promise<ShopifySessionEntity | null> {
        return await this.entityManager.findOne(ShopifySessionEntity, id);
    }

    @SentryInstrument('DatabaseSessionStorage')
    async deleteSession(id: string): Promise<boolean> {
        try {
            const session = await this.entityManager.findOneOrFail(ShopifySessionEntity, id);
            await this.entityManager.removeAndFlush(session);
            return true;
        } catch (err) {
            this.logger.error(err);
        }

        return false;
    }

    @SentryInstrument('DatabaseSessionStorage')
    async deleteSessions(ids: string[]): Promise<boolean> {
        const sessions = await this.entityManager.find(ShopifySessionEntity, ids);
        sessions.forEach(s => this.entityManager.remove(s));
        await this.entityManager.flush();

        return true;
    }

    @SentryInstrument('DatabaseSessionStorage')
    async findSessionsByShop(shop: string): Promise<ShopifySessionEntity[]> {
        const sessions = await this.entityManager.find(ShopifySessionEntity, { shop });

        return sessions;
    }

    @SentryInstrument('DatabaseSessionStorage')
    async deleteSessionsByDomain(domain: string): Promise<boolean> {
        this.logger.log(`Deleting sessions for domain ${domain}`);
        const sessions = await this.entityManager.find(ShopifySessionEntity, { shop: domain });
        sessions.forEach(s => this.entityManager.remove(s));
        await this.entityManager.flush();

        return true;
    }

    @SentryInstrument('DatabaseSessionStorage')
    async save(entity: ShopifySessionEntity) {
        await this.entityManager.persistAndFlush(entity);
    }
}

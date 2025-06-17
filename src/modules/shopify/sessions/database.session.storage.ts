import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { ShopifySessionEntity } from './shopify.session.entity';
import { SessionStorage } from '@nestjs-shopify/core';
import { Telemetry } from 'src/decorators/telemetry';

@Injectable()
export class DatabaseSessionStorage implements SessionStorage {
    private readonly logger = new ExtendedLogger('DatabaseSessionStorage');

    constructor(private readonly entityManager: EntityManager) {}

    @Telemetry('storage.database-session.storeSession')
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

    @Telemetry('storage.database-session.loadSession')
    async loadSession(id: string): Promise<ShopifySessionEntity | undefined> {
        return (await this.entityManager.findOne(ShopifySessionEntity, id)) ?? undefined;
    }

    @Telemetry('storage.database-session.deleteSession')
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

    @Telemetry('storage.database-session.deleteSessions')
    async deleteSessions(ids: string[]): Promise<boolean> {
        const sessions = await this.entityManager.find(ShopifySessionEntity, ids);
        sessions.forEach(s => this.entityManager.remove(s));
        await this.entityManager.flush();

        return true;
    }

    @Telemetry('storage.database-session.findSessionsByShop')
    async findSessionsByShop(shop: string): Promise<ShopifySessionEntity[]> {
        const sessions = await this.entityManager.find(ShopifySessionEntity, { shop });

        return sessions;
    }

    @Telemetry('storage.database-session.deleteSessionsByDomain')
    async deleteSessionsByDomain(domain: string): Promise<boolean> {
        this.logger.log(`Deleting sessions for domain ${domain}`);
        const sessions = await this.entityManager.find(ShopifySessionEntity, { shop: domain });
        sessions.forEach(s => this.entityManager.remove(s));
        await this.entityManager.flush();

        return true;
    }

    @Telemetry('storage.database-session.save')
    async save(entity: ShopifySessionEntity) {
        await this.entityManager.persistAndFlush(entity);
    }
}

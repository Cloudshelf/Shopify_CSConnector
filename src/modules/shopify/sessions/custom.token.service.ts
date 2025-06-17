import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { CustomTokenEntity } from './custom.token.entity';
import { Telemetry } from 'src/decorators/telemetry';
import { ulid } from 'ulid';

@Injectable()
export class CustomTokenService {
    private readonly logger = new ExtendedLogger('CustomTokenService');

    constructor(private readonly entityManager: EntityManager) {}

    @Telemetry('service.custom-token.loadToken')
    async loadToken(domain: string): Promise<CustomTokenEntity | null> {
        return await this.entityManager.findOne(CustomTokenEntity, { shop: domain });
    }

    @Telemetry('service.custom-token.storeToken')
    async storeToken(domain: string, token: string): Promise<boolean> {
        let entity = await this.loadToken(domain);

        if (!entity) {
            entity = this.entityManager.create(CustomTokenEntity, { id: ulid(), shop: domain, token });
        } else {
            entity = this.entityManager.assign(entity, { shop: domain, token });
        }

        try {
            await this.entityManager.persistAndFlush(entity);
            return true;
        } catch (err) {
            this.logger.error(err);
        }

        return false;
    }

    @Telemetry('service.custom-token.deleteTokensByDomain')
    async deleteTokensByDomain(domain: string): Promise<boolean> {
        this.logger.log(`Deleting tokens for domain ${domain}`);
        const sessions = await this.entityManager.find(CustomTokenEntity, { shop: domain });
        sessions.forEach(s => this.entityManager.remove(s));
        await this.entityManager.flush();

        return true;
    }
}

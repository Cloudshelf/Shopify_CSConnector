import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { TestEntity } from './test.entity';

@Injectable()
export class TestService {
    private readonly logger = new Logger('TestService');

    constructor(private readonly entityManager: EntityManager) {}

    @SentryInstrument('TestService')
    async findOneById(id: string) {
        this.logger.log(`findOneById: ${id}`);
        return await this.entityManager.findOne(TestEntity, { id });
    }

    @SentryInstrument('TestService')
    async findAll() {
        this.logger.log(`findAll`);
        return await this.entityManager.find(TestEntity, {});
    }
}

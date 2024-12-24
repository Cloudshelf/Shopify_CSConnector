import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CreateRequestContext, EntityManager, MikroORM } from '@mikro-orm/core';
import { ExtendedLogger } from '../../utils/ExtendedLogger';
import { RetailerEntity } from '../retailer/retailer.entity';
import { ProductJobUtils } from './product.job.utils';

@Injectable()
export class DataIngestionService {
    private readonly logger = new ExtendedLogger('DataIngestionService');

    constructor(
        //orm is required by CreateRequestContext
        private readonly orm: MikroORM,
        private readonly entityManager: EntityManager,
    ) {}

    @Cron('0 2 * * *', { name: 'data-ingestion-safety-sync', timeZone: 'Europe/London' })
    async safetySyncCron() {
        await this.createSafetySyncs();
    }

    @CreateRequestContext()
    async createSafetySyncs() {
        const retailers = await this.entityManager.find(RetailerEntity, {});

        for (const retailer of retailers) {
            this.logger.debug('Creating safety sync for retailer ' + retailer.domain);
            await ProductJobUtils.scheduleTriggerJob(retailer, true, undefined, 'safetySync');
            retailer.lastSafetySyncRequested = new Date();
        }

        await this.entityManager.flush();
    }
}

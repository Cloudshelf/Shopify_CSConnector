import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CreateRequestContext, EntityManager, MikroORM } from '@mikro-orm/core';
import { ExtendedLogger } from '../../utils/ExtendedLogger';
import { NobleTaskEntity } from '../noble/noble.task.entity';
import { RetailerEntity } from '../retailer/retailer.entity';
import { ProductJobService } from './product/product.job.service';

@Injectable()
export class DataIngestionService {
    private readonly logger = new ExtendedLogger('DataIngestionService');

    constructor(
        //orm is required by CreateRequestContext
        private readonly orm: MikroORM,
        private readonly entityManager: EntityManager,
        private readonly productJobService: ProductJobService,
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
            await this.productJobService.scheduleTriggerJob(retailer, true, false);
            retailer.lastSafetySyncRequested = new Date();
        }

        await this.entityManager.flush();
    }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookSubscriptionTopic } from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/postgresql';
import { CloudshelfApiService } from '../cloudshelf/cloudshelf.api.service';
import { cloudshelfSchema } from '../configuration/schemas/cloudshelf.schema';
import { runtimeSchema } from '../configuration/schemas/runtime.schema';
import { RetailerEntity } from '../retailer/retailer.entity';
import { RetailerService } from '../retailer/retailer.service';
import { ToolsUtils } from './tools.utils';
import { internalScheduleTriggerJobs } from 'src/trigger/scheduled/safety_sync';

@Injectable()
export class ToolsService {
    private readonly logger = new Logger('ToolsService');

    constructor(
        private readonly configService: ConfigService<typeof cloudshelfSchema>,
        private readonly runtimeConfigService: ConfigService<typeof runtimeSchema>,
        private readonly entityManager: EntityManager,
    ) {}

    async forceASafetySyncNow() {
        await internalScheduleTriggerJobs(this.entityManager);
    }

    async getWebhooks(retailer: RetailerEntity) {
        return ToolsUtils.getWebhooks(retailer, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async registerAllWebhooksForRetailer(retailer: RetailerEntity) {
        return ToolsUtils.registerAllWebhooksForRetailer(retailer, process.env.HOST!, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async registerWebhookForRetailer(retailer: RetailerEntity, topic: WebhookSubscriptionTopic, url: string) {
        return ToolsUtils.registerWebhookForRetailer(retailer, topic, url, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async registerAllWebhooksForAllRetailers(
        from: number,
        limit: number,
    ): Promise<{
        success: string[];
        failed: string[];
    }> {
        return ToolsUtils.registerAllWebhooksForAllRetailers(
            this.entityManager,
            this.runtimeConfigService.get('HOST')!,
            from,
            limit,
            {
                info: this.logger.log,
                error: this.logger.error,
                warn: this.logger.warn,
            },
        );
    }

    async deleteWebhookForStore(retailer: RetailerEntity, webhookId: string) {
        return ToolsUtils.deleteWebhookForStore(retailer, webhookId, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async deleteAllWebhooksForRetailer(retailer: RetailerEntity) {
        return ToolsUtils.deleteAllWebhooksForRetailer(retailer, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async deleteAllWebhooksForAllStores(
        from: number,
        limit: number,
    ): Promise<{
        success: string[];
        failed: string[];
    }> {
        return ToolsUtils.deleteAllWebhooksForAllStores(this.entityManager, from, limit, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async updateRetailerInfoWhereNull() {
        return ToolsUtils.updateRetailerInfoWhereNull(
            this.configService.get('CLOUDSHELF_API_URL')!,
            this.entityManager,
            {
                info: this.logger.log,
                error: this.logger.error,
                warn: this.logger.warn,
            },
        );
    }

    async sendAllRetailersToCloudshelf() {
        return ToolsUtils.sendAllRetailersToCloudshelf(
            this.configService.get('CLOUDSHELF_API_URL')!,
            this.entityManager,
            {
                info: this.logger.log,
                error: this.logger.error,
                warn: this.logger.warn,
            },
        );
    }
}

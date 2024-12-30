import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookSubscriptionTopic } from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/postgresql';
import { internalScheduleTriggerJobs } from '../../trigger/scheduled/safety_sync';
import { cloudshelfSchema } from '../configuration/schemas/cloudshelf.schema';
import { runtimeSchema } from '../configuration/schemas/runtime.schema';
import { RetailerEntity } from '../retailer/retailer.entity';
import { deleteAllWebhooksForAllStores } from './utils/deleteAllWebhooksForAllStores';
import { deleteAllWebhooksForRetailer } from './utils/deleteAllWebhooksForRetailer';
import { deleteWebhookForStore } from './utils/deleteWebhookForStore';
import { getWebhooks } from './utils/getWebhooks';
import { registerAllWebhooksForAllRetailers } from './utils/registerAllWebhooksForAllRetailers';
import { registerAllWebhooksForRetailer } from './utils/registerAllWebhooksForRetailer';
import { registerWebhookForRetailer } from './utils/registerWebhookForRetailer';
import { sendAllRetailersToCloudshelf } from './utils/sendAllRetailersToCloudshelf';
import { updateRetailerInfoWhereNull } from './utils/updateRetailerInfoWhereNull';

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
        return getWebhooks(retailer, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async registerAllWebhooksForRetailer(retailer: RetailerEntity) {
        return registerAllWebhooksForRetailer(retailer, process.env.HOST!, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async registerWebhookForRetailer(retailer: RetailerEntity, topic: WebhookSubscriptionTopic, url: string) {
        return registerWebhookForRetailer(retailer, topic, url, {
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
        return registerAllWebhooksForAllRetailers(
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
        return deleteWebhookForStore(retailer, webhookId, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async deleteAllWebhooksForRetailer(retailer: RetailerEntity) {
        return deleteAllWebhooksForRetailer(retailer, {
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
        return deleteAllWebhooksForAllStores(this.entityManager, from, limit, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async updateRetailerInfoWhereNull() {
        return updateRetailerInfoWhereNull(this.configService.get('CLOUDSHELF_API_URL')!, this.entityManager, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }

    async sendAllRetailersToCloudshelf() {
        return sendAllRetailersToCloudshelf(this.configService.get('CLOUDSHELF_API_URL')!, this.entityManager, {
            info: this.logger.log,
            error: this.logger.error,
            warn: this.logger.warn,
        });
    }
}

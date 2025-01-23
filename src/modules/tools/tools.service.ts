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
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
        });
    }

    async registerAllWebhooksForRetailer(retailer: RetailerEntity) {
        return registerAllWebhooksForRetailer(retailer, process.env.HOST!, {
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
        });
    }

    async registerWebhookForRetailer(retailer: RetailerEntity, topic: WebhookSubscriptionTopic, url: string) {
        return registerWebhookForRetailer(retailer, topic, url, {
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
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
                info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
                warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
                error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
            },
        );
    }

    async deleteWebhookForStore(retailer: RetailerEntity, webhookId: string) {
        return deleteWebhookForStore(retailer, webhookId, {
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
        });
    }

    async deleteAllWebhooksForRetailer(retailer: RetailerEntity) {
        return deleteAllWebhooksForRetailer(retailer, {
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
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
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
        });
    }

    async updateRetailerInfoWhereNull() {
        return updateRetailerInfoWhereNull(this.configService.get('CLOUDSHELF_API_URL')!, this.entityManager, {
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
        });
    }

    async sendAllRetailersToCloudshelf() {
        return sendAllRetailersToCloudshelf(this.configService.get('CLOUDSHELF_API_URL')!, this.entityManager, {
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
        });
    }

    async fakeLongRunningTask(): Promise<string> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve('Task completed');
            }, 1250);
        });
    }
}

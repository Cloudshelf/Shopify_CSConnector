import { ConfigService } from '@nestjs/config';
import { slackSchema } from '../../../modules/configuration/schemas/slack.schema';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { SlackUtils } from '../../../utils/SlackUtils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { RetailerService } from '../../retailer/retailer.service';
import { DatabaseSessionStorage } from '../sessions/database.session.storage';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';
import { Telemetry } from 'src/decorators/telemetry';
import { TriggerHandlersService } from 'src/modules/trigger-handlers/trigger-handlers.service';
import { TelemetryUtil } from '../../../utils/TelemetryUtil';

@WebhookHandler('APP_UNINSTALLED')
export class UninstalledWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('UninstalledWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly databaseSessionStorage: DatabaseSessionStorage,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly slackConfigService: ConfigService<typeof slackSchema>,
        private readonly triggerHandlersService: TriggerHandlersService,
    ) {
        super();
    }

    @Telemetry('webhook.UninstalledWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.debug(`Webhook ${webhookId} called for shop ID ${domain}`);
        this.logger.debug(data);

        TelemetryUtil.InformationalTransaction('Webhook:Received', 'APP_UNINSTALLED', {
            webhookId,
            domain,
        }, {
            id: domain,
            username: domain,
        });

        const slackToken = this.slackConfigService.get<string>('SLACK_TOKEN');
        const slackNotificationChannel = this.slackConfigService.get<string>('SLACK_GENERAL_NOTIFICATION_CHANNEL');
        const foundRetailer = await this.retailerService.findOneByDomain(domain);

        if (slackToken && slackNotificationChannel) {
            await SlackUtils.SendNotification(
                slackToken,
                slackNotificationChannel,
                NotificationUtils.buildUninstallAttachments(domain, 'uninstall', foundRetailer?.createdAt),
            );
        }

        await this.retailerService.deleteByDomain(domain);
        await this.databaseSessionStorage.deleteSessionsByDomain(domain);
        await this.cloudshelfApiService.reportUninstall(domain);
        try {
            await this.triggerHandlersService.cancelTriggersForDomain({ domain, retailerId: foundRetailer?.id ?? '' });
        } catch (error) {
            this.logger.error(`Error cancelling triggers for domain ${domain}`, error);
        }
    }
}

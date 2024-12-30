import { ConfigService } from '@nestjs/config';
import { slackSchema } from '../../../modules/configuration/schemas/slack.schema';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SlackUtils } from '../../../utils/SlackUtils';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { RetailerService } from '../../retailer/retailer.service';
import { DatabaseSessionStorage } from '../sessions/database.session.storage';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('APP_UNINSTALLED')
export class UninstalledWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('UninstalledWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly databaseSessionStorage: DatabaseSessionStorage,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly slackConfigService: ConfigService<typeof slackSchema>,
    ) {
        super();
    }

    @SentryInstrument('UninstalledWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.debug(`Webhook ${webhookId} called for shop ID ${domain}`);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'APP_UNINSTALLED', {
            id: domain,
            username: domain,
        });

        const slackToken = this.slackConfigService.get<string>('SLACK_TOKEN');
        const slackNotificationChannel = this.slackConfigService.get<string>('SLACK_GENERAL_NOTIFICATION_CHANNEL');

        if (slackToken && slackNotificationChannel) {
            await SlackUtils.SendNotification(
                slackToken,
                slackNotificationChannel,
                NotificationUtils.buildUninstallAttachments(domain, 'uninstall'),
            );
        }

        await this.retailerService.deleteByDomain(domain);
        await this.databaseSessionStorage.deleteSessionsByDomain(domain);
        await this.cloudshelfApiService.reportUninstall(domain);
    }
}

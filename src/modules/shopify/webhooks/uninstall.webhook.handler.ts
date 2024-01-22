import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { SlackService } from '../../integrations/slack.service';
import { RetailerService } from '../../retailer/retailer.service';
import { DatabaseSessionStorage } from '../sessions/database.session.storage';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('APP_UNINSTALLED')
export class UninstalledWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('UninstalledWebhookHandler');

    constructor(
        private readonly slackService: SlackService,
        private readonly retailerService: RetailerService,
        private readonly databaseSessionStorage: DatabaseSessionStorage,
        private readonly cloudshelfApiService: CloudshelfApiService,
    ) {
        super();
    }

    @SentryInstrument('UninstalledWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log(`Webhook ${webhookId} called for shop ID ${domain}`);

        SentryUtil.InformationalTransaction('Webhook:Received', 'APP_UNINSTALLED', {
            id: domain,
            username: domain,
        });

        await this.slackService.sendGeneralNotification(
            NotificationUtils.buildUninstallAttachments(domain, 'uninstall'),
        );

        await this.retailerService.deleteByDomain(domain);
        await this.databaseSessionStorage.deleteSessionsByDomain(domain);
        await this.cloudshelfApiService.reportUninstall(domain);
    }
}

import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
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
    ) {
        super();
    }

    @SentryInstrument('UninstalledWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log(`Webhook ${webhookId} called for shop ID ${domain}`);

        await this.slackService.sendGeneralNotification(
            NotificationUtils.buildUninstallAttachments(domain, 'uninstall'),
        );

        await this.retailerService.deleteByDomain(domain);
        await this.databaseSessionStorage.deleteSessionsByDomain(domain);
        //todo: mark uninstalled in Cloudshelf API
    }
}

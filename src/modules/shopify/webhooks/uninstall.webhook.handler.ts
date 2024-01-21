import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('APP_UNINSTALLED')
export class UninstalledWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('UninstalledWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('UninstalledWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        // const shop = await this.shopRepo.findOneOrFail({ domain });

        this.logger.log(`Webhook ${webhookId} called for shop ID ${domain}`);
        this.logger.log(data);
    }
}

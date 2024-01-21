import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('APP_SUBSCRIPTIONS_UPDATE')
export class SubscriptionUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('SubscriptionUpdateWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('SubscriptionUpdateWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log('Received APP_SUBSCRIPTIONS_UPDATE webhook for domain ' + domain);
        this.logger.log(data);
    }
}

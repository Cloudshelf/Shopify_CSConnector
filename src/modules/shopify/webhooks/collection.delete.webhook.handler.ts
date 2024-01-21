import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('COLLECTIONS_DELETE')
export class CollectionDeleteWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('CollectionDeleteWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('CollectionDeleteWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log('Received COLLECTIONS_DELETE webhook for domain ' + domain);
        this.logger.log(data);
    }
}

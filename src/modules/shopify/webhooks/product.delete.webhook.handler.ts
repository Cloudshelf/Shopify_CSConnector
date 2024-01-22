import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('PRODUCTS_DELETE')
export class ProductsDeleteWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('ProductsDeleteWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('ProductsDeleteWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log('Received PRODUCTS_DELETE webhook for domain ' + domain);
        this.logger.log(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'PRODUCTS_DELETE', {
            id: domain,
            username: domain,
        });
    }
}

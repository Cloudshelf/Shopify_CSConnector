import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('PRODUCTS_UPDATE')
export class ProductsUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('PRODUCTS_UPDATE');

    constructor() {
        super();
    }

    @SentryInstrument('ProductsUpdateWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log('Received PRODUCTS_UPDATE webhook for domain ' + domain);
        // this.logger.log(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'PRODUCTS_UPDATE', {
            id: domain,
            username: domain,
        });
    }
}

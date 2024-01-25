import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface ProductDeleteWebhookPayload {
    id: number;
}

@WebhookHandler('PRODUCTS_DELETE')
export class ProductsDeleteWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('ProductsDeleteWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('ProductsDeleteWebhookHandler')
    async handle(domain: string, data: ProductDeleteWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received PRODUCTS_DELETE webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'PRODUCTS_DELETE', {
            id: domain,
            username: domain,
        });
    }
}

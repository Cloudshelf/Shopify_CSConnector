import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface ProductUpdateWebhookPayload {
    admin_graphql_api_id: string;
}

@WebhookHandler('PRODUCTS_UPDATE')
export class ProductsUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('PRODUCTS_UPDATE');

    constructor() {
        super();
    }

    @SentryInstrument('ProductsUpdateWebhookHandler')
    async handle(domain: string, data: ProductUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received PRODUCTS_UPDATE webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'PRODUCTS_UPDATE', {
            id: domain,
            username: domain,
        });
    }
}

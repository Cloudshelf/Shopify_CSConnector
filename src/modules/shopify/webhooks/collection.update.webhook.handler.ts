import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('COLLECTIONS_UPDATE')
export class CollectionUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('CollectionUpdateWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('CollectionUpdateWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log('Received COLLECTIONS_UPDATE webhook for domain ' + domain);
        this.logger.log(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'COLLECTIONS_UPDATE', {
            id: domain,
            username: domain,
        });
    }
}

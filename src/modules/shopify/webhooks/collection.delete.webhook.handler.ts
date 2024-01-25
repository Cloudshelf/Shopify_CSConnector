import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface CollectionDeleteWebhookPayload {
    id: number;
}

@WebhookHandler('COLLECTIONS_DELETE')
export class CollectionDeleteWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('CollectionDeleteWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('CollectionDeleteWebhookHandler')
    async handle(domain: string, data: CollectionDeleteWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received COLLECTIONS_DELETE webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'COLLECTIONS_DELETE', {
            id: domain,
            username: domain,
        });
    }
}

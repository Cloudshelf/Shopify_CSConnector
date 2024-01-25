import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface CollectionUpdateWebhookPayload {
    admin_graphql_api_id: string;
}

@WebhookHandler('COLLECTIONS_UPDATE')
export class CollectionUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('CollectionUpdateWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('CollectionUpdateWebhookHandler')
    async handle(domain: string, data: CollectionUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received COLLECTIONS_UPDATE webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'COLLECTIONS_UPDATE', {
            id: domain,
            username: domain,
        });
    }
}

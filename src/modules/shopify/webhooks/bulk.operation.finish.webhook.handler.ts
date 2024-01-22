import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('BULK_OPERATIONS_FINISH')
export class BulkOperationFinishedWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('BulkOperationFinishedWebhookHandler');

    constructor() {
        super();
    }

    @SentryInstrument('BulkOperationFinishedWebhookHandler')
    async handle(domain: string, data: unknown, webhookId: string): Promise<void> {
        this.logger.log('Received BULK_OPERATIONS_FINISH webhook for domain ' + domain);
        this.logger.log(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'BULK_OPERATIONS_FINISH', {
            id: domain,
            username: domain,
        });
    }
}

import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface AppSubscriptionUpdateWebhookPayload {
    admin_graphql_api_id: string;
}

@WebhookHandler('APP_SUBSCRIPTIONS_UPDATE')
export class SubscriptionUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('SubscriptionUpdateWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
    ) {
        super();
    }

    @SentryInstrument('SubscriptionUpdateWebhookHandler')
    async handle(domain: string, data: AppSubscriptionUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received APP_SUBSCRIPTIONS_UPDATE webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'APP_SUBSCRIPTIONS_UPDATE', {
            id: domain,
            username: domain,
        });

        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        await this.cloudshelfApiService.requestSubscriptionCheck(retailer, data.admin_graphql_api_id);
    }
}

import { ConfigService } from '@nestjs/config';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface AppSubscriptionUpdateWebhookPayload {
    app_subscription: {
        admin_graphql_api_id: string;
    };
}

@WebhookHandler('APP_SUBSCRIPTIONS_UPDATE')
export class SubscriptionUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('SubscriptionUpdateWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {
        super();
    }

    async handle(domain: string, data: AppSubscriptionUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received APP_SUBSCRIPTIONS_UPDATE webhook for domain ' + domain);
        this.logger.debug(data);

        const shouldIgnore = this.configService.get<boolean>('SHOPIFY_IGNORE_UPDATE_WEBHOOKS');
        if (shouldIgnore) {
            this.logger.debug('Ignoring webhook due to environment configuration');
            return;
        }

        const retailer = await this.retailerService.getByDomain(domain);
        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        await this.cloudshelfApiService.requestSubscriptionCheck(retailer, data.app_subscription.admin_graphql_api_id);
    }
}

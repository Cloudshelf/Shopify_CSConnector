import { ConfigService } from '@nestjs/config';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { ProductJobService } from '../../data-ingestion/product/product.job.service';
import { WebhookQueuedDataActionType } from '../../data-ingestion/webhook.queued.data.action.type';
import { WebhookQueuedDataContentType } from '../../data-ingestion/webhook.queued.data.content.type';
import { WebhookQueuedService } from '../../data-ingestion/webhook.queued.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface ProductUpdateWebhookPayload {
    admin_graphql_api_id: string;
}

@WebhookHandler('PRODUCTS_UPDATE')
export class ProductsUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('PRODUCTS_UPDATE');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly productJobService: ProductJobService,
        private readonly webhookQueuedService: WebhookQueuedService,
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {
        super();
    }

    @SentryInstrument('ProductsUpdateWebhookHandler')
    async handle(domain: string, data: ProductUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received PRODUCTS_UPDATE webhook for domain ' + domain);
        this.logger.debug(data);

        const shouldIgnore = this.configService.get<boolean>('SHOPIFY_IGNORE_UPDATE_WEBHOOKS');
        if (shouldIgnore) {
            this.logger.debug('Ignoring webhook due to environment configuration');
            return;
        }

        await this.webhookQueuedService.queue(
            domain,
            data.admin_graphql_api_id,
            WebhookQueuedDataContentType.PRODUCT,
            WebhookQueuedDataActionType.UPDATE,
        );

        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        await this.productJobService.scheduleTriggerJob(retailer, false, true);
    }
}

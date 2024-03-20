import { ConfigService } from '@nestjs/config';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { WebhookQueuedDataActionType } from '../../data-ingestion/webhook.queued.data.action.type';
import { WebhookQueuedDataContentType } from '../../data-ingestion/webhook.queued.data.content.type';
import { WebhookQueuedService } from '../../data-ingestion/webhook.queued.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface ProductDeleteWebhookPayload {
    id: number;
}

@WebhookHandler('PRODUCTS_DELETE')
export class ProductsDeleteWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('ProductsDeleteWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly webhookQueuedService: WebhookQueuedService,
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {
        super();
    }

    @SentryInstrument('ProductsDeleteWebhookHandler')
    async handle(domain: string, data: ProductDeleteWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received PRODUCTS_DELETE webhook for domain ' + domain);
        this.logger.debug(data);

        const shouldIgnore = this.configService.get<boolean>('SHOPIFY_IGNORE_UPDATE_WEBHOOKS');
        if (shouldIgnore) {
            this.logger.debug('Ignoring webhook due to environment configuration');
            return;
        }

        // const productId = GlobalIDUtils.gidBuilder(data.id, 'ShopifyProduct')!;
        // await this.webhookQueuedService.queue(
        //     domain,
        //     productId,
        //     WebhookQueuedDataContentType.PRODUCT,
        //     WebhookQueuedDataActionType.DELETE,
        // );

        const retailer = await this.retailerService.getByDomain(domain);
        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }
        const productId = GlobalIDUtils.gidBuilder(data.id, 'ShopifyProduct')!;

        await this.cloudshelfApiService.deleteProduct(retailer, productId);
    }
}

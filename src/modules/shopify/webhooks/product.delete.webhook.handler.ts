import { ConfigService } from '@nestjs/config';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';
import { Telemetry } from 'src/decorators/telemetry';

export interface ProductDeleteWebhookPayload {
    id: number;
}

@WebhookHandler('PRODUCTS_DELETE')
export class ProductsDeleteWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('ProductsDeleteWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {
        super();
    }

    @Telemetry('webhook.ProductsDeleteWebhookHandler')
    async handle(domain: string, data: ProductDeleteWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received PRODUCTS_DELETE webhook for domain ' + domain);
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
        const productId = GlobalIDUtils.gidBuilder(data.id, 'ShopifyProduct')!;

        await this.cloudshelfApiService.deleteProduct(retailer, productId);
    }
}

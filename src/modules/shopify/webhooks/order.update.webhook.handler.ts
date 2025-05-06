import { ConfigService } from '@nestjs/config';
import { RetailerService } from '../../../modules/retailer/retailer.service';
import { ProcessOrderTask } from '../../../trigger/data-ingestion/order/process-order';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { OrderUpdateWebhookPayload } from './attrs.cosnts';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

@WebhookHandler('ORDERS_UPDATED')
export class OrdersUpdatedWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('OrderUpdateWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {
        super();
    }

    @SentryInstrument('OrdersUpdatedWebhookHandler')
    async handle(domain: string, data: OrderUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received ORDERS_UPDATED webhook for domain ' + domain);
        this.logger.debug('data: ' + JSON.stringify(data));

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

        const tags: string[] = [`retailer_${retailer.id}`, `domain_${retailer.domain.toLowerCase()}`];

        await ProcessOrderTask.trigger(
            { data, organisationId: retailer.id },
            {
                queue: {
                    name: `order-processing`,
                    concurrencyLimit: 1,
                },
                concurrencyKey: domain,
                tags,
            },
        );
    }
}

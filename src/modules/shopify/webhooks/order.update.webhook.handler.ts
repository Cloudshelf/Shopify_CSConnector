import { ConfigService } from '@nestjs/config';
import { CurrencyCode, OrderLineInput, OrderStatus } from '../../../graphql/cloudshelf/generated/cloudshelf';
import { OrderFinancialStatus } from '../../../graphql/shopifyStorefront/generated/shopifyStorefront';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';
import { RetailerService } from 'src/modules/retailer/retailer.service';
import { ProcessOrderTask } from 'src/trigger/data-ingestion/order/process-order';

export interface OrderUpdateWebhookPayload {
    id: number;
    admin_graphql_api_id: string;
    checkout_id: number;
    cart_token: string;
    financial_status: OrderFinancialStatus;
    note: string;
    currency: CurrencyCode;
    note_attributes: {
        name: string;
        value: string;
    }[];
    line_items: {
        quantity: number;
        product_id: number;
        variant_id: number;
        price: string;
    }[];
}

export const CLOUDSHELF_ORDER_ATTRIBUTE = 'CS_Cloudshelf';
export const CLOUDSHELF_DEVICE_ATTRIBUTE = 'CS_Device';
export const CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE = 'CS_OriginatingStore';
export const CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE = 'CS_SalesAssistant';
export const CLOUDSHELF_SESSION_ATTRIBUTE = 'CS_Session';

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

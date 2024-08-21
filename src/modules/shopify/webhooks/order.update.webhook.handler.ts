import { ConfigService } from '@nestjs/config';
import { CurrencyCode, OrderLineInput, OrderStatus } from '../../../graphql/cloudshelf/generated/cloudshelf';
import { OrderFinancialStatus } from '../../../graphql/shopifyStorefront/generated/shopifyStorefront';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

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

const CLOUDSHELF_ORDER_ATTRIBUTE = 'CS_Cloudshelf';
const CLOUDSHELF_DEVICE_ATTRIBUTE = 'CS_Device';
const CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE = 'CS_OriginatingStore';
const CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE = 'CS_SalesAssistant';
const CLOUDSHELF_SESSION_ATTRIBUTE = 'CS_Session';

@WebhookHandler('ORDERS_UPDATED')
export class OrdersUpdatedWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('OrderUpdateWebhookHandler');

    constructor(
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

        const cloudshelfAttribute = data.note_attributes.find(x => x.name === CLOUDSHELF_ORDER_ATTRIBUTE);
        const deviceAttribute = data.note_attributes.find(x => x.name === CLOUDSHELF_DEVICE_ATTRIBUTE);
        const originatingStoreAttribute = data.note_attributes.find(
            x => x.name === CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE,
        );
        const salesAssistantAttribute = data.note_attributes.find(x => x.name === CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE);
        const sessionAttribute = data.note_attributes.find(x => x.name === CLOUDSHELF_SESSION_ATTRIBUTE);

        const shopifyCartGid = `gid://shopify/Cart/${data.cart_token}`;

        this.logger.debug('Order ID: ' + data.admin_graphql_api_id);
        this.logger.debug('Order for cartID: ' + shopifyCartGid);
        this.logger.debug('Order for CheckoutId:' + data.checkout_id);
        this.logger.debug('Order financial status:' + data.financial_status);
        this.logger.debug(`Order Placed on Cloudshelf: ${cloudshelfAttribute?.value}`);
        this.logger.debug(`Order Device: ${deviceAttribute?.value}`);
        this.logger.debug(`Order Originating Store: ${originatingStoreAttribute?.value}`);
        this.logger.debug(`Order Sales Assistant: ${salesAssistantAttribute?.value}`);
        this.logger.debug(`Order Session: ${sessionAttribute?.value}`);

        let cloudshelfStatus: OrderStatus = OrderStatus.DraftBasket;

        if (
            data.financial_status.toLowerCase() === OrderFinancialStatus.Pending.toLowerCase() ||
            data.financial_status.toLowerCase() === OrderFinancialStatus.Authorized.toLowerCase()
        ) {
            cloudshelfStatus = OrderStatus.Placed;
        } else if (data.financial_status.toLowerCase() === OrderFinancialStatus.Refunded.toLowerCase()) {
            cloudshelfStatus = OrderStatus.Refunded;
        } else if (data.financial_status.toLowerCase() === OrderFinancialStatus.PartiallyRefunded.toLowerCase()) {
            cloudshelfStatus = OrderStatus.PartiallyRefunded;
        } else if (data.financial_status.toLowerCase() === OrderFinancialStatus.Paid.toLowerCase()) {
            cloudshelfStatus = OrderStatus.Paid;
        }

        if (cloudshelfStatus === OrderStatus.DraftBasket) {
            this.logger.debug(
                'Order is in DraftBasket status, which it cannot be at this stage. Shopify Status: ' +
                    data.financial_status,
            );
            return;
        }

        const orderLines: OrderLineInput[] = [];

        for (const line of data.line_items) {
            orderLines.push({
                quantity: line.quantity,
                productID: `gid://external/ShopifyProduct/${line.product_id.toString()}`,
                productVariantID: `gid://external/ShopifyProductVariant/${line.variant_id.toString()}`,
                price: parseFloat(line.price),
                currencyCode: data.currency,
            });
        }

        this.logger.debug(`Order Lines: ${JSON.stringify(orderLines)}`);
        //Possible todo: move this to a noble task and.
        //Possible todo: have the connector create an order if it doesnt already exist (offline cloudshelves)
        await this.cloudshelfApiService.reportOrderStatus(
            domain,
            shopifyCartGid,
            cloudshelfStatus,
            data.admin_graphql_api_id,
            orderLines.length > 0 ? orderLines : undefined,
        );
    }
}

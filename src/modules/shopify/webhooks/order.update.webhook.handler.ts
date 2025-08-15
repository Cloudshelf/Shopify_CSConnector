import { ConfigService } from '@nestjs/config';
import { RetailerService } from '../../../modules/retailer/retailer.service';
import { RetailerStatus } from '../../../modules/retailer/retailer.status.enum';
import { ProcessOrderTask } from '../../../trigger/data-ingestion/order/process-order';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { TriggerTagsUtils } from '../../../utils/TriggerTagsUtils';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { OrderUpdateWebhookPayload } from './attrs.cosnts';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';
import { Telemetry } from 'src/decorators/telemetry';

@WebhookHandler('ORDERS_UPDATED')
export class OrdersUpdatedWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('OrderUpdateWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {
        super();
    }

    @Telemetry('webhook.OrdersUpdatedWebhookHandler')
    async handle(domain: string, data: OrderUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received ORDERS_UPDATED webhook for domain ' + domain);
        this.logger.debug('data: ' + JSON.stringify(data));

        // const slackToken = this.slackConfigService.get<string>('SLACK_TOKEN');

        // await SlackUtils.SendNotification(
        //     slackToken!,
        //     '#test-area',
        //     NotificationUtils.buildOrderNotice(
        //         domain,
        //         webhookId,
        //         `admin_graphql_api_id: ${data.admin_graphql_api_id}`,
        //         'update',
        //     ),
        // );

        //

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

        if (retailer.status === RetailerStatus.IDLE) {
            this.logger.debug(`OrdersUpdatedWebhookHandler: ${retailer.domain} is idle, skipping webhook`);
            return;
        }

        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
        });

        await ProcessOrderTask.trigger(
            { data, organisationId: retailer.id },
            {
                queue: `order-processing`,
                concurrencyKey: domain,
                tags,
            },
        );
    }
}

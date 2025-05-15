import { ConfigService } from '@nestjs/config';
import { RetailerService } from '../../../modules/retailer/retailer.service';
import { ProcessOrderTask } from '../../../trigger/data-ingestion/order/process-order';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { OrderUpdateWebhookPayload } from './attrs.cosnts';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';
import { slackSchema } from 'src/modules/configuration/schemas/slack.schema';
import { NotificationUtils } from 'src/utils/NotificationUtils';
import { SlackUtils } from 'src/utils/SlackUtils';

@WebhookHandler('ORDERS_CREATE')
export class OrdersCreateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('OrdersCreateWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly configService: ConfigService<typeof shopifySchema>,
        private readonly slackConfigService: ConfigService<typeof slackSchema>,
    ) {
        super();
    }

    @SentryInstrument('OrdersCreateWebhookHandler')
    async handle(domain: string, data: OrderUpdateWebhookPayload, webhookId: string): Promise<void> {
        //Just do nothing
        // this.logger.debug('Received ORDERS_CREATE webhook for domain ' + domain);
        // this.logger.debug('data: ' + JSON.stringify(data));
        // const slackToken = this.slackConfigService.get<string>('SLACK_TOKEN');
        // await SlackUtils.SendNotification(
        //     slackToken!,
        //     '#test-area',
        //     NotificationUtils.buildOrderNotice(
        //         domain,
        //         webhookId,
        //         `admin_graphql_api_id: ${data.admin_graphql_api_id}`,
        //         'create',
        //     ),
        // );
        // const shouldIgnore = this.configService.get<boolean>('SHOPIFY_IGNORE_UPDATE_WEBHOOKS');
        // if (shouldIgnore) {
        //     this.logger.debug('Ignoring webhook due to environment configuration');
        //     return;
        // }
        // const retailer = await this.retailerService.getByDomain(domain);
        // if (!retailer) {
        //     this.logger.debug('Cannot get retailer for domain ' + domain);
        //     return;
        // }
        // const tags: string[] = [`retailer_${retailer.id}`, `domain_${retailer.domain.toLowerCase()}`];
        // await ProcessOrderTask.trigger(
        //     { data, organisationId: retailer.id },
        //     {
        //         queue: {
        //             name: `order-processing`,
        //             concurrencyLimit: 1,
        //         },
        //         concurrencyKey: domain,
        //         tags,
        //     },
        // );
    }
}

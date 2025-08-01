import { ConfigService } from '@nestjs/config';
import { RetailerService } from '../../../modules/retailer/retailer.service';
import { ProcessOrderTask } from '../../../trigger/data-ingestion/order/process-order';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { TriggerTagsUtils } from '../../../utils/TriggerTagsUtils';
import { CloudshelfApiOrganisationUtils } from '../../cloudshelf/cloudshelf.api.organisation.util';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { OrderUpdateWebhookPayload } from './attrs.cosnts';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';
import { Telemetry } from 'src/decorators/telemetry';
import { slackSchema } from 'src/modules/configuration/schemas/slack.schema';

@WebhookHandler('ORDERS_UPDATED')
export class OrdersUpdatedWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('OrderUpdateWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly configService: ConfigService<typeof shopifySchema>,
        private readonly slackConfigService: ConfigService<typeof slackSchema>,
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

        await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
            apiUrl: process.env.CLOUDSHELF_API_URL || '',
            domainName: retailer.domain,
            func: async () => {
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
            },
            location: 'OrdersUpdatedWebhookHandler.handle',
        });
    }
}

import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { WebhookQueuedDataActionType } from '../../data-ingestion/webhook.queued.data.action.type';
import { WebhookQueuedDataContentType } from '../../data-ingestion/webhook.queued.data.content.type';
import { WebhookQueuedService } from '../../data-ingestion/webhook.queued.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface CollectionDeleteWebhookPayload {
    id: number;
}

@WebhookHandler('COLLECTIONS_DELETE')
export class CollectionDeleteWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('CollectionDeleteWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly webhookQueuedService: WebhookQueuedService,
    ) {
        super();
    }

    @SentryInstrument('CollectionDeleteWebhookHandler')
    async handle(domain: string, data: CollectionDeleteWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received COLLECTIONS_DELETE webhook for domain ' + domain);
        this.logger.debug(data);

        // const productGroupId = GlobalIDUtils.gidBuilder(data.id, 'ShopifyCollection')!;
        // await this.webhookQueuedService.queue(
        //     domain,
        //     productGroupId,
        //     WebhookQueuedDataContentType.COLLECTION,
        //     WebhookQueuedDataActionType.DELETE,
        // );

        // SentryUtil.InformationalTransaction('Webhook:Received', 'COLLECTIONS_DELETE', {
        //     id: domain,
        //     username: domain,
        // });
        //
        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        const productGroupId = GlobalIDUtils.gidBuilder(data.id, 'ShopifyCollection')!;
        await this.cloudshelfApiService.deleteProductGroup(retailer, productGroupId);
    }
}

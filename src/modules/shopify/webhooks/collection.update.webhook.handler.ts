import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CollectionJobService } from '../../data-ingestion/collection/collection.job.service';
import { ProductJobService } from '../../data-ingestion/product/product.job.service';
import { WebhookQueuedDataActionType } from '../../data-ingestion/webhook.queued.data.action.type';
import { WebhookQueuedDataContentType } from '../../data-ingestion/webhook.queued.data.content.type';
import { WebhookQueuedService } from '../../data-ingestion/webhook.queued.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface CollectionUpdateWebhookPayload {
    admin_graphql_api_id: string;
}

@WebhookHandler('COLLECTIONS_UPDATE')
export class CollectionUpdateWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('CollectionUpdateWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly collectionJobService: CollectionJobService,
        private readonly webhookQueuedService: WebhookQueuedService,
    ) {
        super();
    }

    @SentryInstrument('CollectionUpdateWebhookHandler')
    async handle(domain: string, data: CollectionUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received COLLECTIONS_UPDATE webhook for domain ' + domain);
        this.logger.debug(data);

        await this.webhookQueuedService.queue(
            domain,
            data.admin_graphql_api_id,
            WebhookQueuedDataContentType.COLLECTION,
            WebhookQueuedDataActionType.UPDATE,
        );

        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        await this.collectionJobService.scheduleTriggerJob(retailer, false, true);
    }
}

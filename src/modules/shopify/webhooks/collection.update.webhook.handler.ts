import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CollectionJobService } from '../../data-ingestion/collection/collection.job.service';
import { ProductJobService } from '../../data-ingestion/product/product.job.service';
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
    ) {
        super();
    }

    @SentryInstrument('CollectionUpdateWebhookHandler')
    async handle(domain: string, data: CollectionUpdateWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received COLLECTIONS_UPDATE webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'COLLECTIONS_UPDATE', {
            id: domain,
            username: domain,
        });

        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        await this.collectionJobService.scheduleTriggerJob(retailer, [data.admin_graphql_api_id], false, true);
    }
}

import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
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
    ) {
        super();
    }

    @SentryInstrument('CollectionDeleteWebhookHandler')
    async handle(domain: string, data: CollectionDeleteWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received COLLECTIONS_DELETE webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'COLLECTIONS_DELETE', {
            id: domain,
            username: domain,
        });

        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        const productGroupId = GlobalIDUtils.gidBuilder(data.id, 'ShopifyCollection')!;
        await this.cloudshelfApiService.deleteProductGroup(retailer, productGroupId);
    }
}

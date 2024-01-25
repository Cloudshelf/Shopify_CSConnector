import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { BulkOperationService } from '../../data-ingestion/bulk.operation.service';
import { BulkOperationType } from '../../data-ingestion/bulk.operation.type';
import { CollectionJobService } from '../../data-ingestion/collection/collection.job.service';
import { ProductJobService } from '../../data-ingestion/product/product.job.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';

export interface BulkOperationWebhookPayload {
    admin_graphql_api_id: string;
    completed_at?: string;
    created_at?: string;
    error_code?: string;
    status?: string;
    type?: string;
}

@WebhookHandler('BULK_OPERATIONS_FINISH')
export class BulkOperationFinishedWebhookHandler extends ShopifyWebhookHandler<unknown> {
    private readonly logger = new ExtendedLogger('BulkOperationFinishedWebhookHandler');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly bulkOperationService: BulkOperationService,
        private readonly productJobService: ProductJobService,
        private readonly collectionJobService: CollectionJobService,
    ) {
        super();
    }

    @SentryInstrument('BulkOperationFinishedWebhookHandler')
    async handle(domain: string, data: BulkOperationWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received BULK_OPERATIONS_FINISH webhook for domain ' + domain);
        this.logger.debug(data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'BULK_OPERATIONS_FINISH', {
            id: domain,
            username: domain,
        });

        let bulkOp = await this.bulkOperationService.getOneByThirdPartyId(data.admin_graphql_api_id);
        if (!bulkOp) {
            this.logger.log('bulkOpComplete webhook referenced unknown bulkOp');
            return;
        }

        const retailer = await this.retailerService.getByDomain(domain);
        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        }

        bulkOp = await this.bulkOperationService.updateFromShopify(retailer, bulkOp);

        if (bulkOp?.status === BulkOperationStatus.Completed) {
            this.logger.debug('Bulk operation completed successfully');

            if (bulkOp.type === BulkOperationType.ProductSync) {
                //create the product consumer
                await this.productJobService.scheduleConsumerJob(retailer, bulkOp);
            } else if (bulkOp.type === BulkOperationType.ProductGroupSync) {
                //create the product group consumer
                await this.collectionJobService.scheduleConsumerJob(retailer, bulkOp);
            } else {
                this.logger.error('Unknown bulk operation type ' + bulkOp.type);
            }
        }
    }
}

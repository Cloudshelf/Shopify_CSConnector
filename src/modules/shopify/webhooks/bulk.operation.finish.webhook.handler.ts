import { ConfigService } from '@nestjs/config';
import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryUtil } from '../../../utils/SentryUtil';
import { ProductJobUtils } from '../..//data-ingestion/product.job.utils';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { BulkOperationService } from '../../data-ingestion/bulk.operation.service';
import { BulkOperationType } from '../../data-ingestion/bulk.operation.type';
import { CollectionJobUtils } from '../../data-ingestion/collection.job.utils';
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
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {
        super();
    }

    @SentryInstrument('BulkOperationFinishedWebhookHandler')
    async handle(domain: string, data: BulkOperationWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received BULK_OPERATIONS_FINISH webhook for domain ' + domain);
        this.logger.debug('payload', data);

        SentryUtil.InformationalTransaction('Webhook:Received', 'BULK_OPERATIONS_FINISH', {
            id: domain,
            username: domain,
        });

        const shouldIgnore = this.configService.get<boolean>('SHOPIFY_IGNORE_UPDATE_WEBHOOKS');
        if (shouldIgnore) {
            this.logger.debug('Ignoring webhook due to environment configuration');
            return;
        }

        let bulkOp = await this.bulkOperationService.getOneByThirdPartyId(data.admin_graphql_api_id);
        if (!bulkOp) {
            this.logger.log('bulkOpComplete webhook referenced unknown bulkOp');
            return;
        } else {
            this.logger.debug(`Loaded bulkop from database`, JSON.stringify(bulkOp));
        }

        const retailer = await this.retailerService.getByDomain(domain);
        if (!retailer) {
            this.logger.debug('Cannot get retailer for domain ' + domain);
            return;
        } else {
            this.logger.debug(`Loaded retailer from database`, JSON.stringify(retailer));
        }

        bulkOp = await this.bulkOperationService.updateFromShopify(retailer, bulkOp);

        if (bulkOp?.status === BulkOperationStatus.Completed) {
            this.logger.debug('Bulk operation completed successfully', { bulkOp });

            if (bulkOp.type === BulkOperationType.ProductSync) {
                //create the product consumer
                await ProductJobUtils.scheduleConsumerJob(retailer, bulkOp, `webhook`, {
                    info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
                });
            } else if (bulkOp.type === BulkOperationType.ProductGroupSync) {
                //create the product group consumer
                await CollectionJobUtils.scheduleConsumerJob(retailer, bulkOp, `webhook`, {
                    info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
                });
            } else if (bulkOp.type === BulkOperationType.ProductGroupDeleteSync) {
                //create the product group delete consumer
                await CollectionJobUtils.scheduleDELETEConsumerJob(retailer, bulkOp, `webhook`, {
                    info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
                    warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
                    error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
                });
            } else {
                this.logger.error('Unknown bulk operation type ' + bulkOp.type);
            }
        }
    }
}

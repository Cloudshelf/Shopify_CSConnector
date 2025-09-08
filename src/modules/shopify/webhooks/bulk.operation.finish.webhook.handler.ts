import { ConfigService } from '@nestjs/config';
import { BulkOperationStatus } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyWebhookHandler, WebhookHandler } from '@nestjs-shopify/webhooks';
import { wait } from '@trigger.dev/sdk';
import { Telemetry } from 'src/decorators/telemetry';
import { RetailerStatus } from 'src/modules/retailer/retailer.status.enum';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { TelemetryUtil } from '../../../utils/TelemetryUtil';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { BulkOperationService } from '../../data-ingestion/bulk.operation.service';
import { BulkOperationType } from '../../data-ingestion/bulk.operation.type';
import { RetailerService } from '../../retailer/retailer.service';

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

    @Telemetry('webhook.BulkOperationFinishedWebhookHandler')
    async handle(domain: string, data: BulkOperationWebhookPayload, webhookId: string): Promise<void> {
        this.logger.debug('Received BULK_OPERATIONS_FINISH webhook for domain ' + domain);
        this.logger.debug('payload', data);

        TelemetryUtil.InformationalTransaction(
            'Webhook:Received',
            'BULK_OPERATIONS_FINISH',
            {
                webhookId,
                domain,
                operationId: data.admin_graphql_api_id,
                status: data.status,
            },
            {
                id: domain,
                username: domain,
            },
        );

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

        if (retailer.status === RetailerStatus.IDLE) {
            this.logger.debug('Early exit in Bulk Operation Finish Webhook Handler because retailer is not active');
            return;
        }

        if (bulkOp?.status === BulkOperationStatus.Completed) {
            this.logger.debug('Bulk operation completed successfully', { bulkOp });

            // Find and complete any waiting tokens for this bulk operation
            try {
                this.logger.debug(`Looking for waiting tokens with idempotencyKey: ${bulkOp.shopifyBulkOpId}`);

                // List tokens with the bulk operation ID as the idempotency key
                const tokens = await wait.listTokens({
                    idempotencyKey: bulkOp.shopifyBulkOpId,
                    status: 'WAITING',
                });

                // Complete the first waiting token found
                for await (const token of tokens) {
                    this.logger.log(
                        `Found waiting token ${token.id} for bulk operation ${bulkOp.shopifyBulkOpId}, completing it`,
                    );

                    await wait.completeToken(token.id, {});

                    this.logger.log(`Successfully completed waitpoint token ${token.id}`);
                }
            } catch (error) {
                this.logger.error(`Failed to complete waitpoint for bulk operation ${bulkOp.shopifyBulkOpId}`, error);
                // Don't throw - we don't want to fail the webhook handler
            }
        }
    }
}

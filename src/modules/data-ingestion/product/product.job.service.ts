import { Injectable } from '@nestjs/common';
import { NobleService } from '../../noble/noble.service';
import { ProductConsumerTaskData, ProductTriggerTaskData } from '../../noble/noble.task.data';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { BulkOperation } from '../bulk.operation.entity';

@Injectable()
export class ProductJobService {
    constructor(private readonly nobleService: NobleService) {}

    async scheduleTriggerJob(
        retailer: RetailerEntity,
        explicitIds: any[],
        installSync?: boolean,
        fromWebhook?: boolean,
    ) {
        let delay = 1; //1 second
        let prio = 1;

        if (installSync) {
            prio = 1000;
        }

        if (fromWebhook) {
            delay = 60 * 15; //15 minutes
        }

        const triggerData: ProductTriggerTaskData = {
            dataType: 'product-trigger',
            productIds: explicitIds,
            installSync: installSync ?? false,
        };

        const existingJob = await this.nobleService.getExisingPendingJobForOrganisationIdByType(
            retailer.id,
            NobleTaskType.SyncProductsTrigger,
        );

        if (explicitIds.length === 0) {
            // we want to do a full sync, remove any existing jobs
            if (existingJob) {
                await this.nobleService.deleteTaskById(existingJob.id);
            }

            await this.nobleService.scheduleTask<ProductTriggerTaskData>(
                NobleTaskType.SyncProductsTrigger,
                retailer.id,
                triggerData,
                prio,
                delay,
            );
        } else {
            if (existingJob) {
                const existingJobData = existingJob.data as ProductTriggerTaskData;
                existingJobData.productIds = [...existingJobData.productIds, ...explicitIds];

                await this.nobleService.updateData<ProductTriggerTaskData>(existingJob, {
                    ...existingJobData,
                });
            } else {
                await this.nobleService.scheduleTask<ProductTriggerTaskData>(
                    NobleTaskType.SyncProductsTrigger,
                    retailer.id,
                    triggerData,
                    prio,
                    delay,
                );
            }
        }
    }

    async scheduleConsumerJob(retailer: RetailerEntity, bulkOp: BulkOperation) {
        let prio = 1;

        if (bulkOp.installSync) {
            prio = 1000;
        }

        const consumerData: ProductConsumerTaskData = {
            dataType: 'product-consumer',
            remoteBulkOperationId: bulkOp.shopifyBulkOpId,
            installSync: bulkOp.installSync,
        };

        await this.nobleService.scheduleTask<ProductConsumerTaskData>(
            NobleTaskType.SyncProducts,
            retailer.id,
            consumerData,
            prio,
            1,
        );
    }
}

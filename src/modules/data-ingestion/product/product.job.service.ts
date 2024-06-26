import { Injectable } from '@nestjs/common';
import { NobleService } from '../../noble/noble.service';
import {
    CollectionTriggerTaskData,
    ProductConsumerTaskData,
    ProductTriggerTaskData,
} from '../../noble/noble.task.data';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { BulkOperation } from '../bulk.operation.entity';

@Injectable()
export class ProductJobService {
    constructor(private readonly nobleService: NobleService) {}

    async scheduleTriggerJob(retailer: RetailerEntity, installSync?: boolean, delayOverride?: number) {
        let delay = 60 * 20; //20 minutes
        let prio = 1;

        if (installSync) {
            prio = 1000;
            delay = 10;
        }

        if (delayOverride) {
            delay = delayOverride;
        }

        const triggerData: ProductTriggerTaskData = {
            dataType: 'product-trigger',
            installSync: installSync ?? false,
        };

        let existingJob = await this.nobleService.getExisingPendingJobForOrganisationIdByType(
            retailer.id,
            NobleTaskType.SyncProductsTrigger,
        );

        if (!existingJob || (existingJob && !existingJob.data?.installSync && installSync)) {
            if (existingJob) {
                await this.nobleService.deleteTaskById(existingJob.id);
                existingJob = null;
            }

            await this.nobleService.scheduleTask<CollectionTriggerTaskData>(
                NobleTaskType.SyncProductsTrigger,
                retailer.id,
                triggerData,
                prio,
                delay,
            );
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

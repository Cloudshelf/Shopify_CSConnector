import { Injectable } from '@nestjs/common';
import { NobleService } from '../../noble/noble.service';
import { CollectionConsumerTaskData, CollectionTriggerTaskData } from '../../noble/noble.task.data';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { BulkOperation } from '../bulk.operation.entity';

@Injectable()
export class CollectionJobService {
    constructor(private readonly nobleService: NobleService) {}

    async scheduleTriggerJob(retailer: RetailerEntity, installSync?: boolean) {
        const delay = 1; //1 second
        let prio = 1;

        if (installSync) {
            prio = 1000;
        }

        const triggerData: CollectionTriggerTaskData = {
            dataType: 'collection-trigger',
            installSync: installSync ?? false,
        };

        let existingJob = await this.nobleService.getExisingPendingJobForOrganisationIdByType(
            retailer.id,
            NobleTaskType.SyncCollectionsTrigger,
        );

        if (!existingJob || (existingJob && existingJob.data?.installSync && !installSync)) {
            if (existingJob) {
                await this.nobleService.deleteTaskById(existingJob.id);
                existingJob = null;
            }

            await this.nobleService.scheduleTask<CollectionTriggerTaskData>(
                NobleTaskType.SyncCollectionsTrigger,
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

        const consumerData: CollectionConsumerTaskData = {
            dataType: 'collection-consumer',
            remoteBulkOperationId: bulkOp.shopifyBulkOpId,
            installSync: bulkOp.installSync,
        };

        await this.nobleService.scheduleTask<CollectionConsumerTaskData>(
            NobleTaskType.SyncCollections,
            retailer.id,
            consumerData,
            prio,
            1,
        );
    }
}

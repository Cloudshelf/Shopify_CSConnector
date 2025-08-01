import { OrganisationStatus } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { ProcessProductGroupsTask } from '../../trigger/data-ingestion/product-groups/process-product-groups';
import { RequestProductGroupsTask } from '../../trigger/data-ingestion/product-groups/request-product-groups';
import { CloudshelfApiOrganisationUtils } from '../cloudshelf/cloudshelf.api.organisation.util';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { idempotencyKeys } from '@trigger.dev/sdk';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

export class CollectionJobUtils {
    static async scheduleTriggerJob(
        retailer: RetailerEntity,
        fullSync?: boolean,
        reason?: string,
        logs?: LogsInterface,
    ) {
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            syncType: fullSync ? 'type_full' : 'type_partial',
            reason,
        });
        const delay = '1s';

        await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
            apiUrl: process.env.CLOUDSHELF_API_URL || '',
            domainName: retailer.domain,
            func: async () => {
                await RequestProductGroupsTask.trigger(
                    {
                        organisationId: retailer.id,
                        fullSync: fullSync ?? false,
                    },
                    { delay, queue: `ingestion`, tags, concurrencyKey: retailer.id },
                );
            },
            location: 'CollectionJobUtils.scheduleTriggerJob',
        });
    }

    static async scheduleConsumerJob(
        retailer: RetailerEntity,
        bulkOp: BulkOperation,
        reason?: string,
        logs?: LogsInterface,
    ) {
        const delay = '1s';
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            syncType: bulkOp.installSync ? 'type_full' : 'type_partial',
            reason,
        });

        logs?.info(
            `Asking trigger to schhedule productgroup consumer job for retailer ${retailer.domain} and bulk op ${bulkOp.shopifyBulkOpId}`,
        );

        await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
            apiUrl: process.env.CLOUDSHELF_API_URL || '',
            domainName: retailer.domain,
            func: async () => {
                await ProcessProductGroupsTask.trigger(
                    {
                        remoteBulkOperationId: bulkOp.shopifyBulkOpId,
                        fullSync: bulkOp.installSync ?? false,
                    },
                    {
                        delay,
                        queue: `ingestion`,
                        tags,
                        concurrencyKey: retailer.id,
                        idempotencyKey: await idempotencyKeys.create(bulkOp.shopifyBulkOpId),
                        machine: retailer.triggerMachineSizeProductGroups ?? undefined,
                        maxDuration: retailer.triggerMaxDurationProductGroups ?? undefined,
                    },
                );
            },
            location: 'CollectionJobUtils.scheduleConsumerJob',
        });
    }
}

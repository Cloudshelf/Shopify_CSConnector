import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { RetailerStatus } from '../retailer/retailer.status.enum';
import { HandlePostSync } from 'src/trigger/data-ingestion/handle-post-sync';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

export class PostSyncJobUtils {
    static async scheduleJob(retailer: RetailerEntity, reason?: string, logs?: LogsInterface) {
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            reason,
        });
        const delay = '1s';

        if (retailer.status === RetailerStatus.IDLE) {
            logs?.info(`PostSyncJobUtils: ${retailer.domain} is idle, skipping job`);
            return;
        }

        await HandlePostSync.trigger(
            {
                organisationId: retailer.id,
            },
            {
                delay,
                queue: `ingestion`,
                tags,
                concurrencyKey: retailer.id,
            },
        );
    }
}

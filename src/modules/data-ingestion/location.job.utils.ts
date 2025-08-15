import { SyncLocationsTask } from '../../trigger/data-ingestion/location/sync-locations';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { RetailerStatus } from '../retailer/retailer.status.enum';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

export class LocationJobUtils {
    static async schedule(retailer: RetailerEntity, reason?: string, logs?: LogsInterface) {
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            reason,
        });

        if (retailer.status === RetailerStatus.IDLE) {
            logs?.info(`LocationJobUtils: ${retailer.domain} is idle, skipping job`);
            return;
        }

        await SyncLocationsTask.trigger(
            { organisationId: retailer.id },
            { queue: `ingestion`, concurrencyKey: retailer.id, tags },
        );
    }
}

import { SyncLocationsTask } from '../../trigger/data-ingestion/location/sync-locations';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

export class LocationJobUtils {
    static async schedule(retailer: RetailerEntity, reason?: string, logs?: LogsInterface) {
        const tags = TriggerTagsUtils.createTags({
            domain: retailer.domain,
            retailerId: retailer.id,
            reason,
        });

        SyncLocationsTask.trigger(
            { organisationId: retailer.id },
            {
                queue: `ingestion`,
                concurrencyKey: retailer.id,
                tags,
            },
        );
    }
}

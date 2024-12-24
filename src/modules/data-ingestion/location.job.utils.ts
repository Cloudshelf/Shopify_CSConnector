import { SyncLocationsTask } from '../../trigger/data-ingestion/location/sync-locations';
import { RetailerEntity } from '../retailer/retailer.entity';

export class LocationJobUtils {
    static async schedule(retailer: RetailerEntity, reason?: string) {
        const tags: string[] = [`retailer_${retailer.id}`];
        if (reason) {
            tags.push(`reason_${reason}`);
        }

        SyncLocationsTask.trigger(
            { organisationId: retailer.id },
            {
                queue: {
                    name: `ingestion`,
                    concurrencyLimit: 1,
                },
                concurrencyKey: retailer.id,
                tags,
            },
        );
    }
}

import { RetailerEntity } from '../retailer/retailer.entity';
import { SyncLocationsTask } from 'src/trigger/data-ingestion/location/sync-locations';

export class LocationJobUtils {
    static async schedule(retailer: RetailerEntity) {
        SyncLocationsTask.trigger(
            { organisationId: retailer.id },
            {
                queue: {
                    name: `ingestion`,
                    concurrencyLimit: 1,
                },
                concurrencyKey: retailer.id,
                tags: [`retailer_${retailer.id}`],
            },
        );
    }
}

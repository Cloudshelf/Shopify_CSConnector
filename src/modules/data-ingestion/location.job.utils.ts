import { SyncLocationsTask } from '../../trigger/data-ingestion/location/sync-locations';
import { CloudshelfApiOrganisationUtils } from '../cloudshelf/cloudshelf.api.organisation.util';
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

        await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
            apiUrl: process.env.CLOUDSHELF_API_URL || '',
            domainName: retailer.domain,
            callbackIfActive: async () => {
                await SyncLocationsTask.trigger(
                    { organisationId: retailer.id },
                    { queue: `ingestion`, concurrencyKey: retailer.id, tags },
                );
            },
            location: 'LocationJobUtils.schedule',
        });
    }
}

import { CloudshelfApiOrganisationUtils } from '../cloudshelf/cloudshelf.api.organisation.util';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
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

        await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
            apiUrl: process.env.CLOUDSHELF_API_URL || '',
            domainName: retailer.domain,
            callbackIfActive: async () => {
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
            },
            location: 'PostSyncJobUtils.scheduleJob',
        });
    }
}

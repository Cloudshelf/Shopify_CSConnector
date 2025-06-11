import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { HandlePostSync } from 'src/trigger/data-ingestion/handle-post-sync';

export class PostSyncJobUtils {
    static async scheduleJob(retailer: RetailerEntity, reason?: string, logs?: LogsInterface) {
        const retailerTag = `retailer_${retailer.id}`;
        const tags: string[] = [retailerTag, `domain_${retailer.domain.toLowerCase()}`];
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        const delay = '1s';

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

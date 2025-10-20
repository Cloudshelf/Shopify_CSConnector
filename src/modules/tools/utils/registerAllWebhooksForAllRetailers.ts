import { EntityManager } from '@mikro-orm/postgresql';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { registerAllWebhooksForRetailer } from './registerAllWebhooksForRetailer';

export async function registerAllWebhooksForAllRetailers(
    em: EntityManager,
    host: string,
    from: number,
    limit: number,
    logs?: LogsInterface,
): Promise<{
    success: string[];
    failed: string[];
}> {
    const failed: string[] = [];
    const success: string[] = [];

    const retailers = await em.find(RetailerEntity, {}, { offset: from, limit });
    for (const retailer of retailers) {
        try {
            await registerAllWebhooksForRetailer({ retailer, host, logs, appDataSource: em });
            success.push(retailer.domain);
        } catch (e) {
            failed.push(retailer.domain);
        }
    }

    return { success, failed };
}

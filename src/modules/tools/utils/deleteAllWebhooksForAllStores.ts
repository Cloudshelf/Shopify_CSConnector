import { EntityManager } from '@mikro-orm/postgresql';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { deleteAllWebhooksForRetailer } from './deleteAllWebhooksForRetailer';

export async function deleteAllWebhooksForAllStores(
    em: EntityManager,
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
            await deleteAllWebhooksForRetailer(retailer, logs);
            success.push(retailer.domain);
        } catch (e) {
            failed.push(retailer.domain);
        }
    }

    return { success, failed };
}

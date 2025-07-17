import { EntityManager } from '@mikro-orm/postgresql';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { CloudshelfApiStoreUtils } from 'src/modules/cloudshelf/cloudshelf.api.store.util';

export async function sendAllRetailersToCloudshelf(cloudshelfAPIURL: string, em: EntityManager, logs?: LogsInterface) {
    const retailers = await em.find(RetailerEntity, {});

    for (const retailer of retailers) {
        try {
            await CloudshelfApiStoreUtils.upsertStore(cloudshelfAPIURL, retailer, logs);
        } catch (e) {
            logs?.error(`Failed to send retailer to cloudshelf for ${retailer.domain}`);
        }
    }
}

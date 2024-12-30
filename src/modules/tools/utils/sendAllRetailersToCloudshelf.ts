import { EntityManager } from '@mikro-orm/postgresql';
import { CloudshelfApiUtils } from '../../cloudshelf/cloudshelf.api.util';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';

export async function sendAllRetailersToCloudshelf(cloudshelfAPIURL: string, em: EntityManager, logs?: LogsInterface) {
    const retailers = await em.find(RetailerEntity, {});

    for (const retailer of retailers) {
        try {
            await CloudshelfApiUtils.upsertStore(cloudshelfAPIURL, retailer, logs);
        } catch (e) {
            logs?.error(`Failed to send retailer to cloudshelf for ${retailer.domain}`);
        }
    }
}

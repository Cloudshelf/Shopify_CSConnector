import { EntityManager } from '@mikro-orm/postgresql';
import { CloudshelfApiUtils } from '../../cloudshelf/cloudshelf.api.util';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { RetailerUtils } from '../../retailer/retailer.utils';

export async function updateRetailerInfoWhereNull(cloudshelfAPIURL: string, em: EntityManager, logs?: LogsInterface) {
    const retailersWithNullInfo = await em.find(RetailerEntity, {
        $or: [
            {
                displayName: null,
            },
            {
                email: null,
            },
            {
                currencyCode: null,
            },
        ],
    });

    for (const retailer of retailersWithNullInfo) {
        try {
            const updatedRetailer = await RetailerUtils.updateShopInformationFromShopifyGraphql(em, retailer, logs);
            await CloudshelfApiUtils.upsertStore(cloudshelfAPIURL, retailer, logs);
        } catch (e) {
            logs?.error(`Failed to update retailer info for ${retailer.domain}`);
        }
    }
}

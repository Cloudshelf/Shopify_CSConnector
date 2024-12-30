import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { deleteWebhookForStore } from './deleteWebhookForStore';
import { getWebhooks } from './getWebhooks';

export async function deleteAllWebhooksForRetailer(retailer: RetailerEntity, logs?: LogsInterface) {
    const webhooks = await getWebhooks(retailer, logs);
    for (const webhook of webhooks) {
        await deleteWebhookForStore(retailer, webhook.node.id);
    }
}

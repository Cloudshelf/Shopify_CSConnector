import { WebhookSubscriptionTopic } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { getWebhooks } from './getWebhooks';
import { registerWebhookForRetailer } from './registerWebhookForRetailer';

export async function registerAllWebhooksForRetailer(retailer: RetailerEntity, host: string, logs?: LogsInterface) {
    const allWebhooks = await getWebhooks(retailer);
    const topics = allWebhooks.map(w => w.node.topic.toString());
    logs?.info(`existing webhooks`, { topics });

    const webhookURL = new URL('/shopify/webhooks', host).toString();

    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.OrdersUpdated)) {
        const r1 = await registerWebhookForRetailer(retailer, WebhookSubscriptionTopic.OrdersUpdated, webhookURL, logs);
        if (!r1) {
            logs?.error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.OrdersUpdated}`,
            );
            throw new Error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.OrdersUpdated}`,
            );
        }
    }
    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.OrdersCreate)) {
        const r1 = await registerWebhookForRetailer(retailer, WebhookSubscriptionTopic.OrdersCreate, webhookURL, logs);
        if (!r1) {
            logs?.error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.OrdersCreate}`,
            );
            throw new Error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.OrdersCreate}`,
            );
        }
    }
    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.BulkOperationsFinish)) {
        const r2 = await registerWebhookForRetailer(
            retailer,
            WebhookSubscriptionTopic.BulkOperationsFinish,
            webhookURL,
            logs,
        );
        if (!r2) {
            logs?.error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.BulkOperationsFinish}`,
            );
            throw new Error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.BulkOperationsFinish}`,
            );
        }
    }
    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.AppUninstalled)) {
        const r3 = await registerWebhookForRetailer(
            retailer,
            WebhookSubscriptionTopic.AppUninstalled,
            webhookURL,
            logs,
        );
        if (!r3) {
            logs?.error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.AppUninstalled}`,
            );
            throw new Error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.AppUninstalled}`,
            );
        }
    }
    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.ProductsDelete)) {
        const r5 = await registerWebhookForRetailer(
            retailer,
            WebhookSubscriptionTopic.ProductsDelete,
            webhookURL,
            logs,
        );
        if (!r5) {
            logs?.error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.ProductsDelete}`,
            );
            throw new Error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.ProductsDelete}`,
            );
        }
    }
    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.CollectionsDelete)) {
        const r7 = await registerWebhookForRetailer(
            retailer,
            WebhookSubscriptionTopic.CollectionsDelete,
            webhookURL,
            logs,
        );
        if (!r7) {
            logs?.error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.CollectionsDelete}`,
            );
            throw new Error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.CollectionsDelete}`,
            );
        }
    }
    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.AppSubscriptionsUpdate)) {
        const r8 = await registerWebhookForRetailer(
            retailer,
            WebhookSubscriptionTopic.AppSubscriptionsUpdate,
            webhookURL,
            logs,
        );
        if (!r8) {
            logs?.error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.AppSubscriptionsUpdate}`,
            );
            throw new Error(
                `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.AppSubscriptionsUpdate}`,
            );
        }
    }
}

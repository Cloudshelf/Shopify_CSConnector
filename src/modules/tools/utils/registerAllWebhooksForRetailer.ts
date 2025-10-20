import { WebhookSubscriptionTopic } from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/core';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { getWebhooks } from './getWebhooks';
import { registerWebhookForRetailer } from './registerWebhookForRetailer';

export async function registerAllWebhooksForRetailer({
    retailer,
    host,
    logs,
    appDataSource,
    runId,
}: {
    retailer: RetailerEntity;
    host: string;
    logs?: LogsInterface;
    appDataSource: EntityManager;
    runId?: string;
}) {
    const allWebhooks = await getWebhooks(retailer);
    const topics = allWebhooks.map(w => w.node.topic.toString());
    logs?.info(`existing webhooks`, { topics });

    const webhookURL = new URL('/shopify/webhooks', host).toString();

    if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.OrdersUpdated)) {
        const r1 = await registerWebhookForRetailer({
            retailer,
            topic: WebhookSubscriptionTopic.OrdersUpdated,
            url: webhookURL,
            logs,
            appDataSource,
            runId,
        });
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
        const r1 = await registerWebhookForRetailer({
            retailer,
            topic: WebhookSubscriptionTopic.OrdersCreate,
            url: webhookURL,
            logs,
            appDataSource,
            runId,
        });
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
        const r2 = await registerWebhookForRetailer({
            retailer,
            topic: WebhookSubscriptionTopic.BulkOperationsFinish,
            url: webhookURL,
            logs,
            appDataSource: appDataSource,
            runId,
        });
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
        const r3 = await registerWebhookForRetailer({
            retailer,
            topic: WebhookSubscriptionTopic.AppUninstalled,
            url: webhookURL,
            logs,
            appDataSource: appDataSource,
            runId,
        });
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
        const r5 = await registerWebhookForRetailer({
            retailer,
            topic: WebhookSubscriptionTopic.ProductsDelete,
            url: webhookURL,
            logs,
            appDataSource: appDataSource,
            runId,
        });
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
        const r7 = await registerWebhookForRetailer({
            retailer,
            topic: WebhookSubscriptionTopic.CollectionsDelete,
            url: webhookURL,
            logs,
            appDataSource,
            runId,
        });
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
        const r8 = await registerWebhookForRetailer({
            retailer,
            topic: WebhookSubscriptionTopic.AppSubscriptionsUpdate,
            url: webhookURL,
            logs,
            appDataSource,
            runId,
        });
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

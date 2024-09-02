import {
    DeleteWebhookDocument,
    DeleteWebhookMutation,
    DeleteWebhookMutationVariables,
    RegisterWebhookDocument,
    RegisterWebhookMutation,
    RegisterWebhookMutationVariables,
    WebhookSubscriptionFormat,
    WebhookSubscriptionInput,
    WebhookSubscriptionTopic,
    WebhooksDocument,
    WebhooksQuery,
    WebhooksQueryVariables,
} from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import { EntityManager } from '@mikro-orm/postgresql';
import { CloudshelfApiUtils, LogsInterface } from '../cloudshelf/cloudshelf.api.util';
import { RetailerEntity } from '../retailer/retailer.entity';
import { RetailerUtils } from '../retailer/retailer.utils';

export class ToolsUtils {
    static async getWebhooks(retailer: RetailerEntity, logs?: LogsInterface) {
        const authedClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

        const webhooks: Array<{
            __typename?: 'WebhookSubscriptionEdge';
            node: {
                __typename?: 'WebhookSubscription';
                id: string;
                topic: WebhookSubscriptionTopic;
            };
        }> = [];
        let resp = await authedClient.query<WebhooksQuery, WebhooksQueryVariables>({
            query: WebhooksDocument,
        });
        if (!resp.data || resp.error || resp.errors) {
            return [];
        }

        webhooks.push(...resp.data.webhookSubscriptions.edges);
        while (resp.data.webhookSubscriptions.pageInfo.hasNextPage) {
            //Wait for 500ms to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));
            resp = await authedClient.query<WebhooksQuery, WebhooksQueryVariables>({
                query: WebhooksDocument,
                variables: {
                    after: resp.data.webhookSubscriptions.pageInfo.endCursor,
                },
            });
            if (!resp.data || resp.error || resp.errors) {
                break;
            }
            webhooks.push(...resp.data.webhookSubscriptions.edges);
        }

        return webhooks;
    }

    static async registerAllWebhooksForRetailer(retailer: RetailerEntity, host: string, logs?: LogsInterface) {
        const allWebhooks = await this.getWebhooks(retailer);

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.OrdersUpdated)) {
            const r1 = await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.OrdersUpdated,
                `https://${host}/shopify/webhooks`,
            );

            if (!r1) {
                logs?.error(
                    `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.OrdersUpdated}`,
                );
                throw new Error(
                    `Failed to register webhook for retailer ${retailer.domain} and topic ${WebhookSubscriptionTopic.OrdersUpdated}`,
                );
            }
        }

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.BulkOperationsFinish)) {
            const r2 = await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.BulkOperationsFinish,
                `https://${host}/shopify/webhooks`,
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
            const r3 = await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.AppUninstalled,
                `https://${host}/shopify/webhooks`,
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
            const r5 = await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.ProductsDelete,
                `https://${host}/shopify/webhooks`,
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
            const r7 = await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.CollectionsDelete,
                `https://${host}/shopify/webhooks`,
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
            const r8 = await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.AppSubscriptionsUpdate,
                `https://${host}/shopify/webhooks`,
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

    static async registerWebhookForRetailer(
        retailer: RetailerEntity,
        topic: WebhookSubscriptionTopic,
        url: string,
        logs?: LogsInterface,
    ) {
        try {
            const authedClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

            const subscription: WebhookSubscriptionInput = {
                callbackUrl: url,
                format: WebhookSubscriptionFormat.Json,
                includeFields: [],
                metafieldNamespaces: [],
            };

            const resp = await authedClient.mutate<RegisterWebhookMutation, RegisterWebhookMutationVariables>({
                mutation: RegisterWebhookDocument,
                variables: {
                    topic,
                    subscription,
                },
            });

            if (!resp.data || resp.errors) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    static async registerAllWebhooksForAllRetailers(
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
                await this.registerAllWebhooksForRetailer(retailer, host, logs);
                success.push(retailer.domain);
            } catch (e) {
                failed.push(retailer.domain);
            }
        }

        return { success, failed };
    }

    static async deleteWebhookForStore(retailer: RetailerEntity, webhookId: string, logs?: LogsInterface) {
        const authedClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

        const resp = await authedClient.mutate<DeleteWebhookMutation, DeleteWebhookMutationVariables>({
            mutation: DeleteWebhookDocument,
            variables: {
                id: webhookId,
            },
        });
        if (!resp.data || resp.errors) {
            return false;
        }

        return true;
    }

    static async deleteAllWebhooksForRetailer(retailer: RetailerEntity, logs?: LogsInterface) {
        const webhooks = await this.getWebhooks(retailer, logs);
        for (const webhook of webhooks) {
            await this.deleteWebhookForStore(retailer, webhook.node.id);
        }
    }

    static async deleteAllWebhooksForAllStores(
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
                await this.deleteAllWebhooksForRetailer(retailer, logs);
                success.push(retailer.domain);
            } catch (e) {
                failed.push(retailer.domain);
            }
        }

        return { success, failed };
    }

    static async updateRetailerInfoWhereNull(cloudshelfAPIURL: string, em: EntityManager, logs?: LogsInterface) {
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

    static async sendAllRetailersToCloudshelf(cloudshelfAPIURL: string, em: EntityManager, logs?: LogsInterface) {
        const retailers = await em.find(RetailerEntity, {});

        for (const retailer of retailers) {
            try {
                await CloudshelfApiUtils.upsertStore(cloudshelfAPIURL, retailer, logs);
            } catch (e) {
                logs?.error(`Failed to send retailer to cloudshelf for ${retailer.domain}`);
            }
        }
    }
}

import { Injectable, Logger } from '@nestjs/common';
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
import { EntityManager } from '@mikro-orm/core';
import { RetailerEntity } from '../retailer/retailer.entity';
import { RetailerService } from '../retailer/retailer.service';

@Injectable()
export class ToolsService {
    private readonly logger = new Logger('ToolsService');

    constructor(private readonly entityManager: EntityManager, private readonly retailerService: RetailerService) {}

    async getWebhooks(retailer: RetailerEntity) {
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

    async registerAllWebhooksForRetailer(retailer: RetailerEntity) {
        const allWebhooks = await this.getWebhooks(retailer);

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.BulkOperationsFinish)) {
            await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.BulkOperationsFinish,
                `https://${process.env.PUBLIC_HOSTNAME}/shopify/webhooks`,
            );
        }

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.AppUninstalled)) {
            await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.AppUninstalled,
                `https://${process.env.HOST}/shopify/webhooks`,
            );
        }

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.ProductsUpdate)) {
            await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.ProductsUpdate,
                `https://${process.env.HOST}/shopify/webhooks`,
            );
        }

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.ProductsDelete)) {
            await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.ProductsDelete,
                `https://${process.env.HOST}/shopify/webhooks`,
            );
        }

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.CollectionsUpdate)) {
            await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.CollectionsUpdate,
                `https://${process.env.HOST}/shopify/webhooks`,
            );
        }

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.CollectionsDelete)) {
            await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.CollectionsDelete,
                `https://${process.env.HOST}/shopify/webhooks`,
            );
        }

        if (!allWebhooks.find(w => w.node.topic === WebhookSubscriptionTopic.AppSubscriptionsUpdate)) {
            await this.registerWebhookForRetailer(
                retailer,
                WebhookSubscriptionTopic.AppSubscriptionsUpdate,
                `https://${process.env.HOST}/shopify/webhooks`,
            );
        }
    }

    async registerWebhookForRetailer(retailer: RetailerEntity, topic: WebhookSubscriptionTopic, url: string) {
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
    }

    async registerAllWebhooksForAllRetailers(
        from: number,
        limit: number,
    ): Promise<{
        success: string[];
        failed: string[];
    }> {
        const failed: string[] = [];
        const success: string[] = [];

        const retailers = await this.retailerService.getAll(from, limit);
        for (const retailer of retailers) {
            try {
                await this.registerAllWebhooksForRetailer(retailer);
                success.push(retailer.domain);
            } catch (e) {
                failed.push(retailer.domain);
            }
        }

        return { success, failed };
    }

    async deleteWebhookForStore(retailer: RetailerEntity, webhookId: string) {
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

    async deleteAllWebhooksForRetailer(retailer: RetailerEntity) {
        const webhooks = await this.getWebhooks(retailer);
        for (const webhook of webhooks) {
            await this.deleteWebhookForStore(retailer, webhook.node.id);
        }
    }

    async deleteAllWebhooksForAllStores(
        from: number,
        limit: number,
    ): Promise<{
        success: string[];
        failed: string[];
    }> {
        const failed: string[] = [];
        const success: string[] = [];
        const retailers = await this.retailerService.getAll(from, limit);
        for (const retailer of retailers) {
            try {
                await this.deleteAllWebhooksForRetailer(retailer);
                success.push(retailer.domain);
            } catch (e) {
                failed.push(retailer.domain);
            }
        }

        return { success, failed };
    }
}
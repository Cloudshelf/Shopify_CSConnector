import {
    WebhookSubscriptionTopic,
    WebhooksDocument,
    WebhooksQuery,
    WebhooksQueryVariables,
} from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyGraphqlUtil } from '../../shopify/shopify.graphql.util';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';

export async function getWebhooks(retailer: RetailerEntity, logs?: LogsInterface) {
    const authedClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer({ retailer, logs });

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

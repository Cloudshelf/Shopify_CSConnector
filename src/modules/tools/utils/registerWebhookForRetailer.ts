import {
    RegisterWebhookDocument,
    RegisterWebhookMutation,
    RegisterWebhookMutationVariables,
    WebhookSubscriptionFormat,
    WebhookSubscriptionTopic,
} from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { WebhookSubscriptionInputWithCallback } from '../../../graphql/shopifyAdmin/types/webhook-extensions';
import { ShopifyGraphqlUtil } from '../../shopify/shopify.graphql.util';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';

export async function registerWebhookForRetailer(
    retailer: RetailerEntity,
    topic: WebhookSubscriptionTopic,
    url: string,
    logs?: LogsInterface,
) {
    try {
        logs?.info(`Creating webook ${topic} to host ${url}`);
        const authedClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer({ retailer });

        const subscription: WebhookSubscriptionInputWithCallback = {
            callbackUrl: url,
            format: WebhookSubscriptionFormat.Json,
            includeFields: [],
            metafieldNamespaces: [],
        };

        const resp = await authedClient.mutate<RegisterWebhookMutation, RegisterWebhookMutationVariables>({
            mutation: RegisterWebhookDocument,
            variables: {
                topic,
                subscription: subscription as unknown as WebhookSubscriptionInputWithCallback,
            },
        });

        if (!resp.data || resp.errors) {
            logs?.error(`Error creating webhook`, resp.errors);
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

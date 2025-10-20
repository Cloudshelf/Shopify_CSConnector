import {
    RegisterWebhookDocument,
    RegisterWebhookMutation,
    RegisterWebhookMutationVariables,
    WebhookSubscriptionFormat,
    WebhookSubscriptionTopic,
} from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { WebhookSubscriptionInputWithCallback } from '../../../graphql/shopifyAdmin/types/webhook-extensions';
import { ShopifyGraphqlUtil } from '../../shopify/shopify.graphql.util';
import { EntityManager } from '@mikro-orm/core';
import { handleStoreClosedError } from 'src/trigger/reuseables/handleStoreClosedError';
import { getDbForTrigger } from 'src/trigger/reuseables/initialization';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';

export async function registerWebhookForRetailer({
    retailer,
    topic,
    url,
    logs,
    runId,
    appDataSource,
}: {
    retailer: RetailerEntity;
    topic: WebhookSubscriptionTopic;
    url: string;
    logs?: LogsInterface;
    runId?: string;
    appDataSource: EntityManager;
}) {
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
        handleStoreClosedError({
            appDataSource,
            cloudshelfApiUrl: process.env.CLOUDSHELF_API_URL!,
            runId: runId!,
            retailer: retailer,
            err: new Error('Failed to register webhook'),
        });
        return false;
    }
}

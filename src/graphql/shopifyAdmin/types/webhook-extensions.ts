import { WebhookSubscriptionInput as GeneratedWebhookSubscriptionInput } from '../generated/shopifyAdmin';

/**
 * Extended WebhookSubscriptionInput that includes the callbackUrl field for HTTP webhooks.
 *
 * The Shopify API accepts callbackUrl for HTTP webhook subscriptions, but the
 * introspection schema doesn't include it in the WebhookSubscriptionInput type.
 * This is likely because Shopify uses a union type for different endpoint types.
 *
 * According to Shopify documentation, callbackUrl should be passed directly in
 * the WebhookSubscriptionInput for HTTP webhooks.
 */
export interface WebhookSubscriptionInputWithCallback extends GeneratedWebhookSubscriptionInput {
    /** The URL endpoint for HTTP webhook subscriptions */
    callbackUrl?: string;
}
import { AbortTaskRunError } from '@trigger.dev/sdk';

export interface RetailerSyncEnvironmentConfig {
    CLOUDSHELF_API_URL: string;
    SHOPIFY_CONNECTOR_HOST: string;
    CLOUDFLARE_R2_PUBLIC_ENDPOINT: string;
    FILE_PREFIX: string;
    SLACK_TOKEN: string;
    SLACK_HEALTH_NOTIFICATION_CHANNEL: string;
}

export function validateEnvironmentForRetailerSync(): RetailerSyncEnvironmentConfig {
    const CLOUDSHELF_API_URL = process.env.CLOUDSHELF_API_URL;
    const SHOPIFY_CONNECTOR_HOST = process.env.SHOPIFY_CONNECTOR_HOST;
    const CLOUDFLARE_R2_PUBLIC_ENDPOINT = process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
    const CLOUDFLARE_R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const CLOUDFLARE_R2_ACCESS_KEY_SECRET = process.env.CLOUDFLARE_R2_ACCESS_KEY_SECRET;
    const FILE_PREFIX = process.env.FILE_PREFIX;
    const SLACK_TOKEN = process.env.SLACK_TOKEN;
    const SLACK_HEALTH_NOTIFICATION_CHANNEL = process.env.SLACK_HEALTH_NOTIFICATION_CHANNEL;

    if (!CLOUDSHELF_API_URL) {
        throw new AbortTaskRunError('CLOUDSHELF_API_URL missing from ENV');
    }

    if (!SHOPIFY_CONNECTOR_HOST) {
        throw new AbortTaskRunError('SHOPIFY_CONNECTOR_HOST missing from ENV');
    }

    if (!CLOUDFLARE_R2_PUBLIC_ENDPOINT) {
        throw new AbortTaskRunError('CLOUDFLARE_R2_PUBLIC_ENDPOINT missing from ENV');
    }

    if (!CLOUDFLARE_R2_ACCESS_KEY_ID) {
        throw new AbortTaskRunError('CLOUDFLARE_R2_ACCESS_KEY_ID missing from ENV');
    }

    if (!CLOUDFLARE_R2_ACCESS_KEY_SECRET) {
        throw new AbortTaskRunError('CLOUDFLARE_R2_ACCESS_KEY_SECRET missing from ENV');
    }

    if (!FILE_PREFIX) {
        throw new AbortTaskRunError('FILE_PREFIX missing from ENV');
    }

    if (!SLACK_TOKEN) {
        throw new AbortTaskRunError('SLACK_TOKEN missing from ENV');
    }

    if (!SLACK_HEALTH_NOTIFICATION_CHANNEL) {
        throw new AbortTaskRunError('SLACK_HEALTH_NOTIFICATION_CHANNEL missing from ENV');
    }

    return {
        CLOUDSHELF_API_URL,
        SHOPIFY_CONNECTOR_HOST,
        CLOUDFLARE_R2_PUBLIC_ENDPOINT,
        FILE_PREFIX,
        SLACK_TOKEN,
        SLACK_HEALTH_NOTIFICATION_CHANNEL,
    };
}

import { AbortTaskRunError } from '@trigger.dev/sdk';

export interface RetailerSyncEnvironmentConfig {
    CLOUDSHELF_API_URL: string;
    SHOPIFY_CONNECTOR_HOST: string;
    CLOUDFLARE_R2_PUBLIC_ENDPOINT: string;
    FILE_PREFIX: string;
}

export function validateEnvironmentForRetailerSync(): RetailerSyncEnvironmentConfig {
    const CLOUDSHELF_API_URL = process.env.CLOUDSHELF_API_URL;
    const SHOPIFY_CONNECTOR_HOST = process.env.SHOPIFY_CONNECTOR_HOST;
    const CLOUDFLARE_R2_PUBLIC_ENDPOINT = process.env.CLOUDFLARE_R2_PUBLIC_ENDPOINT;
    const FILE_PREFIX = process.env.FILE_PREFIX;

    if (!CLOUDSHELF_API_URL) {
        throw new AbortTaskRunError('CLOUDSHELF_API_URL missing from ENV');
    }

    if (!SHOPIFY_CONNECTOR_HOST) {
        throw new AbortTaskRunError('SHOPIFY_CONNECTOR_HOST missing from ENV');
    }

    if (!CLOUDFLARE_R2_PUBLIC_ENDPOINT) {
        throw new AbortTaskRunError('CLOUDFLARE_R2_PUBLIC_ENDPOINT missing from ENV');
    }

    if (!FILE_PREFIX) {
        throw new AbortTaskRunError('FILE_PREFIX missing from ENV');
    }

    return {
        CLOUDSHELF_API_URL,
        SHOPIFY_CONNECTOR_HOST,
        CLOUDFLARE_R2_PUBLIC_ENDPOINT,
        FILE_PREFIX,
    };
}

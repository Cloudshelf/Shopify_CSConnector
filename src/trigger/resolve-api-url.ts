import { logger } from '@trigger.dev/sdk';
import { getEnvConfig } from './reuseables/initialization';

/**
 * Resolves the Cloudshelf API URL, working in both Trigger.dev task context
 * (via locals) and NestJS application context (via process.env).
 * Returns null if the URL cannot be resolved.
 */
export function resolveApiUrl(): string | null {
    try {
        return getEnvConfig().CLOUDSHELF_API_URL;
    } catch {
        // Not in Trigger.dev task context — fall back to process.env
    }

    const url = process.env.CLOUDSHELF_API_URL;
    if (!url) {
        logger.warn('[resolveApiUrl] CLOUDSHELF_API_URL not available in env or Trigger locals');
        return null;
    }
    return url;
}

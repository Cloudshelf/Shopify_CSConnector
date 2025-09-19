export interface ShopifyRetryConfig {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    multiplier: number;
    jitter: boolean;
    retryableNetworkErrors: string[];
    retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_CONFIG: ShopifyRetryConfig = {
    maxAttempts: parseInt(process.env.SHOPIFY_RETRY_MAX_ATTEMPTS || '5', 10),
    initialDelay: parseInt(process.env.SHOPIFY_RETRY_INITIAL_DELAY || '2000', 10),
    maxDelay: parseInt(process.env.SHOPIFY_RETRY_MAX_DELAY || '240000', 10), // 4 minutes
    multiplier: parseFloat(process.env.SHOPIFY_RETRY_MULTIPLIER || '2'),
    jitter: process.env.SHOPIFY_RETRY_JITTER !== 'false',
    retryableNetworkErrors: [
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'EPIPE',
        'ENOTFOUND',
        'ENETUNREACH',
        'EAI_AGAIN',
    ],
    retryableStatusCodes: [429, 499, 502, 503, 504],
};

export function calculateExponentialBackoff(
    attempt: number,
    config: ShopifyRetryConfig = DEFAULT_RETRY_CONFIG,
): number {
    const { initialDelay, maxDelay, multiplier, jitter } = config;

    // Calculate exponential delay
    let delay = initialDelay * Math.pow(multiplier, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, maxDelay);

    // Add jitter to prevent thundering herd
    if (jitter) {
        // Random factor between 0.5 and 1.5
        const jitterFactor = 0.5 + Math.random();
        delay = Math.round(delay * jitterFactor);
    }

    return delay;
}

export function isRetryableNetworkError(error: any, config: ShopifyRetryConfig = DEFAULT_RETRY_CONFIG): boolean {
    if (!error) return false;

    // Check for network error codes
    const errorCode = error.code || error.errno || (error.cause && error.cause.code);
    if (errorCode && config.retryableNetworkErrors.includes(errorCode)) {
        return true;
    }

    // Check for common timeout messages
    const errorMessage = error.message || error.toString();
    if (errorMessage) {
        const timeoutPatterns = [
            /timeout/i,
            /timed out/i,
            /ETIMEDOUT/,
            /ECONNRESET/,
            /ECONNREFUSED/,
            /socket hang up/i,
        ];
        return timeoutPatterns.some(pattern => pattern.test(errorMessage));
    }

    return false;
}

export function isRetryableStatusCode(statusCode: number | undefined, config: ShopifyRetryConfig = DEFAULT_RETRY_CONFIG): boolean {
    return statusCode !== undefined && config.retryableStatusCodes.includes(statusCode);
}
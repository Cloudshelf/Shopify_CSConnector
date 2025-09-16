import { Logger } from '@nestjs/common';
import { ApolloLink } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { GraphQLError } from 'graphql';
import * as _ from 'lodash';
import { Observable } from 'zen-observable-ts';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { CostExtension, ShopifyExecutionResult } from './shopify.throttling.extension';
import {
    ShopifyRetryConfig,
    DEFAULT_RETRY_CONFIG,
    calculateExponentialBackoff,
    isRetryableNetworkError,
    isRetryableStatusCode,
} from './shopify.retry.config';

const logger = new Logger('ShopifyRetryLink');

interface RetryContext {
    attempt: number;
    maxAttempts: number;
    lastError?: any;
    retryReason?: string;
}

/**
 * Shopify responds uses the THROTTLED error code if a query failed because the api credit
 * was insufficient, or the query was too expensive (> 1000 points).
 */
function isThrottlingError(error: GraphQLError): boolean {
    return (
        error.extensions?.exception?.code === 'throttled' ||
        error.message?.toLowerCase().includes('throttled') ||
        error.name?.toLowerCase().includes('throttled')
    );
}

/**
 * If the query failed because of a temporary lack of credit, we can compute the time we need
 * to wait for by calculating the missing credit, and dividing it by the restore rate.
 */
function calculateThrottleDelay(cost: CostExtension): number {
    const {
        requestedQueryCost,
        actualQueryCost,
        throttleStatus: { currentlyAvailable, restoreRate },
    } = cost;

    const requested = actualQueryCost || requestedQueryCost;
    const restoreAmount = Math.max(0, requested - currentlyAvailable);
    const rawMsToWait = Math.ceil(restoreAmount / restoreRate);

    const msToWait = Math.ceil(rawMsToWait) * 1000;
    logger.warn(
        `Throttle delay calculation - Raw: ${rawMsToWait}s, Delay: ${msToWait}ms, ` +
        `Requested: ${requested}, Short: ${restoreAmount}, Restore/Sec: ${restoreRate}`,
    );
    return msToWait;
}

/**
 * If the query is more expensive than the maximum available (1000 points for a regular developer
 * account), then the query will never succeed.
 */
function exceedsMaximumCost(cost: CostExtension): boolean {
    const {
        requestedQueryCost,
        actualQueryCost,
        throttleStatus: { maximumAvailable },
    } = cost;

    const requested = actualQueryCost || requestedQueryCost;
    return requested > maximumAvailable;
}

export function delay(msToWait: number): Observable<any> {
    return new Observable(observer => {
        const timer = setTimeout(() => {
            observer.complete();
        }, msToWait);

        return () => clearTimeout(timer);
    });
}

/**
 * Creates a retry link that handles both network errors and Shopify throttling
 */
export function createShopifyRetryLink(logs?: LogsInterface, config: ShopifyRetryConfig = DEFAULT_RETRY_CONFIG): ApolloLink {
    // RetryLink for network errors with exponential backoff
    const retryLink = new RetryLink({
        delay: {
            initial: config.initialDelay,
            max: config.maxDelay,
            jitter: config.jitter,
        },
        attempts: {
            max: config.maxAttempts,
            retryIf: (error, operation) => {
                const context = operation.getContext();
                const retryContext: RetryContext = context.retryContext || { attempt: 0, maxAttempts: config.maxAttempts };

                // Extract network error and status code
                const networkError = error?.networkError || error;
                const statusCode = networkError?.statusCode ||
                                  networkError?.response?.status ||
                                  (networkError as any)?.status;

                // Check if it's a retryable network error
                if (isRetryableNetworkError(networkError, config)) {
                    retryContext.attempt++;
                    retryContext.retryReason = `Network error: ${networkError.code || networkError.message}`;

                    const retryDelay = calculateExponentialBackoff(retryContext.attempt, config);

                    logger.warn(
                        `Retrying due to network error (attempt ${retryContext.attempt}/${config.maxAttempts}): ` +
                        `${networkError.code || networkError.message}. Waiting ${retryDelay}ms`,
                    );
                    logs?.warn?.(
                        `[ShopifyRetryLink] Network retry (${retryContext.attempt}/${config.maxAttempts}): ` +
                        `${networkError.code || networkError.message}, delay: ${retryDelay}ms`,
                    );

                    operation.setContext({ ...context, retryContext });
                    return retryContext.attempt <= config.maxAttempts;
                }

                // Check if it's a retryable HTTP status code
                if (isRetryableStatusCode(statusCode, config)) {
                    retryContext.attempt++;
                    retryContext.retryReason = `HTTP ${statusCode}`;

                    const retryDelay = calculateExponentialBackoff(retryContext.attempt, config);

                    logger.warn(
                        `Retrying due to HTTP ${statusCode} (attempt ${retryContext.attempt}/${config.maxAttempts}). ` +
                        `Waiting ${retryDelay}ms`,
                    );
                    logs?.warn?.(
                        `[ShopifyRetryLink] HTTP retry (${retryContext.attempt}/${config.maxAttempts}): ` +
                        `Status ${statusCode}, delay: ${retryDelay}ms`,
                    );

                    operation.setContext({ ...context, retryContext });
                    return retryContext.attempt <= config.maxAttempts;
                }

                return false;
            },
        },
    });

    // Error link for Shopify-specific throttling ONLY
    const errorLink = onError(({ graphQLErrors, networkError, forward, operation, response }) => {
        // Log network errors but don't handle them here (RetryLink handles them)
        if (networkError) {
            logs?.warn?.(
                `[ShopifyRetryLink] Network error (handled by RetryLink): ${JSON.stringify(
                    networkError,
                    Object.getOwnPropertyNames(networkError),
                    2,
                )}`,
            );
            // Let RetryLink handle network errors
            return;
        }

        // Only handle GraphQL errors from here
        if (!graphQLErrors) {
            return;
        }

        // Check for invalid API key errors (non-retryable)
        // @ts-ignore - Shopify returns strings in some error cases
        const invalidAPIKey = _.includes(graphQLErrors, 'unrecognized login or wrong password');
        if (invalidAPIKey) {
            logger.error('Invalid API key detected, cannot retry');
            return;
        }

        const isThrottled = graphQLErrors.some(isThrottlingError);
        if (!isThrottled) {
            // Not a throttling error, let it pass through
            return;
        }

        // Handle Shopify throttling with cost-based retry
        const context = operation.getContext();
        const throttleRetryCount = context.throttleRetryCount || 0;

        const cost = (response as ShopifyExecutionResult | undefined)?.extensions?.cost;
        if (!cost) {
            logger.verbose('Throttled but no cost information provided');
            // Try exponential backoff as fallback
            if (throttleRetryCount < config.maxAttempts) {
                const retryDelay = calculateExponentialBackoff(throttleRetryCount + 1, config);

                logger.warn(`Throttled without cost info, using exponential backoff: ${retryDelay}ms`);
                logs?.warn?.(`[ShopifyRetryLink] Throttled, exponential backoff: ${retryDelay}ms`);

                operation.setContext({ ...context, throttleRetryCount: throttleRetryCount + 1 });
                return delay(retryDelay).concat(forward(operation));
            }
            return;
        }

        if (exceedsMaximumCost(cost)) {
            logger.error('Query exceeds maximum allowed cost, cannot retry');
            logs?.error?.('[ShopifyRetryLink] Query too expensive, aborting');
            return;
        }

        // Calculate delay based on Shopify's cost information
        const msToWait = calculateThrottleDelay(cost) * 1.5; // Add 50% buffer

        // Cap the delay at our configured maximum
        const finalDelay = Math.min(msToWait, config.maxDelay);

        logger.warn(`Shopify throttled, waiting ${finalDelay}ms (calculated: ${msToWait}ms)`);
        logs?.warn?.(`[ShopifyRetryLink] Throttled, waiting ${finalDelay}ms`);

        operation.setContext({ ...context, throttleRetryCount: throttleRetryCount + 1, retry: true, msToWait: finalDelay });

        return delay(finalDelay).concat(forward(operation));
    });

    // Combine retry link and error link
    return ApolloLink.from([retryLink, errorLink]);
}


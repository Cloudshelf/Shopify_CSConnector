import { Logger } from '@nestjs/common';
import { onError } from '@apollo/client/link/error';
import { GraphQLError } from 'graphql';
import { EntityManager } from '@mikro-orm/core';
import * as _ from 'lodash';
import { env } from 'process';
import { CloudshelfApiOrganisationUtils } from 'src/modules/cloudshelf/cloudshelf.api.organisation.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerStatus } from 'src/modules/retailer/retailer.status.enum';
import { RetailerUtils } from 'src/modules/retailer/retailer.utils';
import { STORE_CLOSED_ERROR_CODE } from 'src/utils/ShopifyConstants';
import { Observable } from 'zen-observable-ts';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { CostExtension, ShopifyExecutionResult } from './shopify.throttling.extension';

const logger = new Logger('ShopifyThrottlingErrorLink');

/**
 * Shopify responds uses the THROTTLED error code if a query failed because the api credit
 * was insufficient, or the query was too expensive (> 1000 points).
 *
 * See:
 * - https://shopify.dev/concepts/about-apis/rate-limits#graphql-admin-api-rate-limits
 * - https://paramander.com/en/blog/handle-rate-limit-errors-in-shopify-admin-graphql-api-using-apollo-client
 */
function isThrottlingError(error: GraphQLError) {
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
function calculateDelayCost(cost: CostExtension) {
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
        `Delay Cost. Raw: ${rawMsToWait}, Act: ${msToWait}, Req: ${requested}, Short: ${restoreAmount}, Restore/Sec:${restoreRate}`,
    );
    return msToWait;
}

/**
 * If the query is more expensive than the maximum available (1000 points for a regular developer
 * account), then the query will never succeed.
 */
function exceedsMaximumCost(cost: CostExtension) {
    const {
        requestedQueryCost,
        actualQueryCost,
        throttleStatus: { maximumAvailable },
    } = cost;

    const requested = actualQueryCost || requestedQueryCost;
    return requested > maximumAvailable;
}

function delay(msToWait: number) {
    return new Observable(observer => {
        const timer = setTimeout(() => {
            observer.complete();
        }, msToWait);

        return () => clearTimeout(timer);
    });
}

function debugLog(networkError: any, graphQLErrors: any) {
    if (networkError) {
        logger.verbose(
            `Unknown error. Network: ${JSON.stringify(networkError, Object.getOwnPropertyNames(networkError), 2)}`,
        );
    }

    if (graphQLErrors) {
        logger.verbose(
            `Unknown error. GraphQL Error: ${JSON.stringify(
                graphQLErrors,
                Object.getOwnPropertyNames(graphQLErrors),
                2,
            )}`,
        );
    }
}

async function updateRetailerStatusToClosed(retailer: RetailerEntity, em: EntityManager, logs?: LogsInterface) {
    try {
        logs?.warn(`[ShopifyRetryLink] updating retailer status to closed`);
        retailer.closed = true;
        await em.persistAndFlush(retailer);
        await CloudshelfApiOrganisationUtils.setOrganisationClosed({
            apiUrl: process.env.CLOUDSHELF_API_URL as string,
            retailer,
            logs,
        });
    } catch (error) {
        logs?.error(`[ShopifyRetryLink] error updating retailer status to closed: ${JSON.stringify(error)}`);
    }
}

export function createShopifyRetryLink({
    logs,
    statusCodesToNotRetry,
    retailer,
    em,
}: {
    logs?: LogsInterface;
    statusCodesToNotRetry?: number[];
    retailer?: RetailerEntity;
    em?: EntityManager;
}) {
    return onError(({ graphQLErrors, networkError, forward, operation, response }) => {
        if (statusCodesToNotRetry?.includes((networkError as any)?.statusCode ?? 0)) {
            // @ts-ignore
            logs?.warn(`[ShopifyRetryLink] statusCodeToNotRetry: ${networkError?.statusCode}`);
            return;
        }

        if (networkError) {
            logs?.warn(
                `[ShopifyRetryLink] networkError: ${JSON.stringify(
                    networkError,
                    Object.getOwnPropertyNames(networkError),
                    2,
                )}`,
            );

            if ((networkError as any)?.statusCode === STORE_CLOSED_ERROR_CODE && retailer && em) {
                updateRetailerStatusToClosed(retailer, em, logs);
            }
        }

        if (graphQLErrors) {
            if (!Array.isArray(graphQLErrors)) {
                logs?.warn(
                    `[ShopifyRetryLink] graphQLErrors: ${JSON.stringify(
                        graphQLErrors,
                        Object.getOwnPropertyNames(graphQLErrors),
                        2,
                    )}`,
                );
            }
        }

        //In TRUE shopify fashion... the errors are not strongly typed and they return... you guessed it a bloody string instead!
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const invalidAPIKey = _.includes(graphQLErrors, 'unrecognized login or wrong password');
        if (invalidAPIKey) {
            //We can't do anything here
            return;
        }

        if (networkError) {
            logger.verbose('Network error');
            debugLog(networkError, graphQLErrors);
            // A non 429 connection error.
            // Fallback to ApolloClient's own error handler.
            return;
        }

        if (!graphQLErrors) {
            logger.verbose('GraphQL errors not provided');
            debugLog(networkError, graphQLErrors);
            // An error we cannot respond to with rate limit handling. We require a specific error extension.
            // Fallback to ApolloClient's own error handler.
            return;
        }
        const isThrottled = graphQLErrors && graphQLErrors.some(isThrottlingError);

        if (!isThrottled) {
            logger.verbose("We don't appear to be throttled. Unknown Error");
            debugLog(networkError, graphQLErrors);
            // There was no throttling for this request.
            // Fallback to ApolloClient's own error handler.
            return;
        }

        const cost = (response as ShopifyExecutionResult | undefined)?.extensions?.cost;
        if (!cost) {
            logger.verbose('No cost information included in the query');
            // We require the cost extension to calculate the delay.
            // Fallback to ApolloClient's own error handler.
            return;
        }

        if (exceedsMaximumCost(cost)) {
            logger.error(`Shopify query is too expensive, aborting...`);
            // Your query costs more than the maximum allowed cost.
            // Fallback to ApolloClient's own error handler.
            return;
        }

        const msToWait = calculateDelayCost(cost) * 1.5;
        logger.warn(`Shopify query throttled; will wait: ${msToWait}`);
        logs?.warn(`Shopify query throttled; will wait: ${msToWait}`);

        operation.setContext({ retry: true, msToWait });
        return delay(msToWait).concat(forward(operation));
    });
}

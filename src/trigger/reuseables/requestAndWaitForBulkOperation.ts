import { BulkOperationStatus } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/postgresql';
import { logger, wait } from '@trigger.dev/sdk';
import { LogsInterface } from 'src/modules/cloudshelf/logs.interface';
import { BulkOperation } from 'src/modules/data-ingestion/bulk.operation.entity';
import { BulkOperationType } from 'src/modules/data-ingestion/bulk.operation.type';
import { BulkOperationUtils } from 'src/modules/data-ingestion/bulk.operation.utils';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { SyncStyle } from '../syncOptions.type';

export interface RequestAndWaitForBulkOperationParams {
    appDataSource: EntityManager;
    retailer: RetailerEntity;
    operationType: BulkOperationType;
    queryPayload: string;
    syncStyle: SyncStyle;
    timeoutSeconds: number;
    maxWaits: number;
    logs?: LogsInterface;
    waitpointTags?: string[];
}

/**
 * Requests a bulk operation and waits for it to complete or timeout.
 * If waitpoint.ok is true, returns immediately.
 * If waitpoint.ok is false and status is RUNNING, waits again up to maxWaits times.
 */
export async function requestAndWaitForBulkOperation(
    params: RequestAndWaitForBulkOperationParams,
): Promise<BulkOperation | undefined> {
    const {
        appDataSource,
        retailer,
        operationType,
        queryPayload,
        syncStyle,
        timeoutSeconds,
        maxWaits,
        logs,
        waitpointTags = [],
    } = params;
    let idempotencyKeyTTL = timeoutSeconds - 20;
    if (idempotencyKeyTTL <= 0) {
        idempotencyKeyTTL = 1;
    }

    // Request the bulk operation
    let bulkOperation: BulkOperation | undefined;
    try {
        bulkOperation = await BulkOperationUtils.requestBulkOperation(
            appDataSource,
            retailer,
            operationType,
            queryPayload,
            syncStyle === 'full',
            logs,
        );
    } catch (err) {
        logger.error('Failed to request bulk operation', { error: err });
        throw err;
    }

    if (!bulkOperation) {
        return undefined;
    }

    let currentWaitCount = 0;
    let isComplete = false;

    while (currentWaitCount < maxWaits && !isComplete) {
        // Create wait token with specified timeout
        const waitpointToken = await wait.createToken({
            timeout: `${timeoutSeconds}s`,
            tags: waitpointTags,
            idempotencyKey: `${bulkOperation.shopifyBulkOpId}`,
            idempotencyKeyTTL: `${idempotencyKeyTTL}s`,
        });

        // Wait for the token
        const waitpointResult = await wait.forToken(waitpointToken.id);

        logger.info(
            waitpointResult.ok
                ? `Waitpoint completed (wait ${currentWaitCount + 1}/${maxWaits})`
                : `Waitpoint expired (wait ${currentWaitCount + 1}/${maxWaits})`,
        );

        // Update bulk operation status from Shopify
        bulkOperation = await BulkOperationUtils.updateFromShopify(appDataSource, retailer, bulkOperation, logs);

        // If waitpoint.ok is true, we're done - DO NOT wait again
        if (waitpointResult.ok) {
            logger.info('Waitpoint completed successfully, returning bulk operation');
            isComplete = true;
            break;
        }

        // If waitpoint expired but operation is not running, we're done
        if (
            bulkOperation.status !== BulkOperationStatus.Created &&
            bulkOperation.status !== BulkOperationStatus.Running
        ) {
            logger.info(`Bulk operation status is ${bulkOperation.status}, stopping wait loop`);
            isComplete = true;
            break;
        }

        // Operation is still running, increment wait count
        currentWaitCount++;

        // If we haven't reached max waits, continue the loop
        if (currentWaitCount < maxWaits) {
            logger.info(`Bulk operation still running, waiting again (${currentWaitCount + 1}/${maxWaits})`);
        } else {
            logger.warn(`Reached maximum number of waits (${maxWaits}), bulk operation still running`);
        }
    }

    // Log how long Shopify took to process the bulk operation
    if (bulkOperation.startedAt && bulkOperation.endedAt) {
        const durationMs = bulkOperation.endedAt.getTime() - bulkOperation.startedAt.getTime();
        const durationSeconds = Math.round(durationMs / 1000);
        logger.info(`Shopify bulk operation processing time: ${durationSeconds} seconds`, {
            data: {
                operationType,
                retailerDomain: retailer.domain,
                bulkOpId: bulkOperation.shopifyBulkOpId,
                startedAt: bulkOperation.startedAt.toISOString(),
                endedAt: bulkOperation.endedAt.toISOString(),
                durationSeconds,
                objectCount: bulkOperation.objectCount,
                status: bulkOperation.status,
            },
        });
    }

    return bulkOperation;
}

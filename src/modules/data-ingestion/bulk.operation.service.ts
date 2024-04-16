import { Injectable } from '@nestjs/common';
import {
    BulkOperationByShopifyIdDocument,
    BulkOperationByShopifyIdQuery,
    BulkOperationByShopifyIdQueryVariables,
    BulkOperationStatus,
    CreateShopifyBulkOperationDocument,
    CreateShopifyBulkOperationMutation,
    CreateShopifyBulkOperationMutationVariables,
    CurrentBulkOperationDocument,
    CurrentBulkOperationQuery,
    CurrentBulkOperationQueryVariables,
} from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import { EntityManager } from '@mikro-orm/core';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { BulkOperationType } from './bulk.operation.type';

@Injectable()
export class BulkOperationService {
    constructor(private readonly entityManager: EntityManager) {}

    async create(
        thirdPartyId: string,
        type: BulkOperationType,
        retailerDomain: string,
        explicitIds?: string[],
        installSync?: boolean,
    ) {
        const now = new Date();
        const op = this.entityManager.create(BulkOperation, {
            explicitIds: explicitIds ?? [],
            installSync: installSync ?? false,
            domain: retailerDomain,
            shopifyBulkOpId: thirdPartyId,
            status: BulkOperationStatus.Created,
            type,
            createdAt: now,
            updatedAt: now,
        });

        await this.entityManager.persistAndFlush(op);
        return op;
    }

    async checkForRunningBulkOperationByRetailer(
        retailer: RetailerEntity,
        logFn?: (s: string) => void,
    ): Promise<{ status: BulkOperationStatus; id: string } | undefined> {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer, logFn);

        const result = await graphqlClient.query<CurrentBulkOperationQuery, CurrentBulkOperationQueryVariables>({
            query: CurrentBulkOperationDocument,
        });

        if (result.errors || result.error) {
            logFn?.(`Failed to get current bulk operation: ${JSON.stringify(result)}`);
            throw new Error(`Error getting current bulk operation: ${JSON.stringify(result)}`);
        }

        if (!result.data || !result.data.currentBulkOperation) {
            return undefined;
        }

        return { status: result.data.currentBulkOperation.status, id: result.data.currentBulkOperation.id };
    }

    async requestBulkOperation(
        retailer: RetailerEntity,
        operationType: BulkOperationType,
        explicitIds: string[],
        queryPayload: string,
        installSync?: boolean,
        logFn?: (s: string) => void,
    ): Promise<BulkOperation> {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

        const results = await graphqlClient.mutate<
            CreateShopifyBulkOperationMutation,
            CreateShopifyBulkOperationMutationVariables
        >({
            mutation: CreateShopifyBulkOperationDocument,
            variables: {
                queryString: queryPayload,
            },
        });

        if (results.errors) {
            logFn?.(`Failed to create a bulk operation on shopify (Mutation Error): ${JSON.stringify(results)}`);
            throw new Error(
                `Failed to create a bulk operation on shopify (Mutation Error): ${JSON.stringify(results)}`,
            );
        }

        const shopifyBulkOp = results.data?.bulkOperationRunQuery?.bulkOperation;
        if (!shopifyBulkOp) {
            if (results.data?.bulkOperationRunQuery?.userErrors) {
                logFn?.(
                    `Failed to create a bulk operation on shopify (Has User Errors): ${JSON.stringify(
                        results.data?.bulkOperationRunQuery?.userErrors,
                    )}`,
                );
                throw new Error(
                    `Failed to create a bulk operation on shopify (Has User Errors) ${JSON.stringify(
                        results.data?.bulkOperationRunQuery?.userErrors,
                    )}`,
                );
            }
            logFn?.(
                `Failed to create a bulk operation on shopify (Unknown error, no bulk op returned): ${JSON.stringify(
                    results,
                )}`,
            );
            throw new Error(
                `Failed to create a bulk operation on shopify (Unknown error, no bulk op returned): ${JSON.stringify(
                    results,
                )}`,
            );
        }

        if (shopifyBulkOp.status !== BulkOperationStatus.Created) {
            logFn?.(
                `Failed to create a bulk operation on shopify (Unknown error, bulk op status not created): ${JSON.stringify(
                    results,
                )}`,
            );
            throw new Error(
                `Failed to create a bulk operation on shopify (Unknown error, bulk op status not created): ${JSON.stringify(
                    results,
                )}`,
            );
        }

        const newBulkOp = await this.create(shopifyBulkOp.id, operationType, retailer.domain, explicitIds, installSync);
        return newBulkOp;
    }

    async getOneById(id: string) {
        return this.entityManager.findOne(BulkOperation, { id });
    }

    async getOneByThirdPartyId(remoteBulkOperationId: string) {
        return this.entityManager.findOne(BulkOperation, { shopifyBulkOpId: remoteBulkOperationId });
    }

    async updateFromShopify(retailer: RetailerEntity, bulkOp: BulkOperation) {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

        const query = await graphqlClient.query<BulkOperationByShopifyIdQuery, BulkOperationByShopifyIdQueryVariables>({
            query: BulkOperationByShopifyIdDocument,
            variables: {
                nodeId: bulkOp.shopifyBulkOpId,
            },
        });

        if (query.data.node?.__typename !== 'BulkOperation') {
            // the bulk operation was deleted on shopify
            return bulkOp;
        }

        bulkOp.dataUrl = query.data.node.url;
        bulkOp.startedAt = query.data.node.createdAt ? new Date(query.data.node.createdAt) : null;
        bulkOp.endedAt = query.data.node.completedAt ? new Date(query.data.node.completedAt) : null;
        bulkOp.status = query.data.node.status ?? 'UNKNOWN';
        await this.entityManager.persistAndFlush(bulkOp);

        return bulkOp;
    }
}

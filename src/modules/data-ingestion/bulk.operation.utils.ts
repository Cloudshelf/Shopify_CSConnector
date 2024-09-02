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
import { LogsInterface } from '../cloudshelf/cloudshelf.api.util';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { BulkOperationType } from './bulk.operation.type';

export class BulkOperationUtils {
    static async create(
        em: EntityManager,
        thirdPartyId: string,
        type: BulkOperationType,
        retailerDomain: string,
        fullSync?: boolean,
    ) {
        const now = new Date();
        const op = em.create(BulkOperation, {
            installSync: fullSync ?? false,
            domain: retailerDomain,
            shopifyBulkOpId: thirdPartyId,
            status: BulkOperationStatus.Created,
            type,
            createdAt: now,
            updatedAt: now,
        });

        await em.persistAndFlush(op);
        return op;
    }

    static async checkForRunningBulkOperationByRetailer(
        retailer: RetailerEntity,
        logs?: LogsInterface,
    ): Promise<{ status: BulkOperationStatus; id: string } | undefined> {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer, logs);

        const result = await graphqlClient.query<CurrentBulkOperationQuery, CurrentBulkOperationQueryVariables>({
            query: CurrentBulkOperationDocument,
        });

        if (result.errors || result.error) {
            logs?.error?.(`Failed to get current bulk operation: ${JSON.stringify(result)}`);
            throw new Error(`Error getting current bulk operation: ${JSON.stringify(result)}`);
        }

        if (!result.data || !result.data.currentBulkOperation) {
            return undefined;
        }

        return { status: result.data.currentBulkOperation.status, id: result.data.currentBulkOperation.id };
    }

    static async requestBulkOperation(
        em: EntityManager,
        retailer: RetailerEntity,
        operationType: BulkOperationType,
        queryPayload: string,
        installSync?: boolean,
        logs?: LogsInterface,
    ): Promise<BulkOperation> {
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer, logs);

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
            logs?.error?.(`Failed to create a bulk operation on shopify (Mutation Error): ${JSON.stringify(results)}`);
            throw new Error(
                `Failed to create a bulk operation on shopify (Mutation Error): ${JSON.stringify(results)}`,
            );
        }

        const shopifyBulkOp = results.data?.bulkOperationRunQuery?.bulkOperation;
        if (!shopifyBulkOp) {
            if (results.data?.bulkOperationRunQuery?.userErrors) {
                logs?.error?.(
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
            logs?.error?.(
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
            logs?.error?.(
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

        const newBulkOp = await this.create(em, shopifyBulkOp.id, operationType, retailer.domain, installSync);
        return newBulkOp;
    }

    static async getOneById(em: EntityManager, id: string) {
        return em.findOne(BulkOperation, { id });
    }

    static async getOneByThirdPartyId(em: EntityManager, remoteBulkOperationId: string) {
        return em.findOne(BulkOperation, { shopifyBulkOpId: remoteBulkOperationId });
    }

    static async updateFromShopify(em: EntityManager, retailer: RetailerEntity, bulkOp: BulkOperation) {
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
        await em.persistAndFlush(bulkOp);

        return bulkOp;
    }
}

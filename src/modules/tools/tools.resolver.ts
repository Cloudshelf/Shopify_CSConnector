import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean, GraphQLInt } from 'graphql';
import { GraphQLString } from 'graphql/type';
import { BulkOperationService } from '../data-ingestion/bulk.operation.service';
import { BulkOperationType } from '../data-ingestion/bulk.operation.type';
import { CollectionJobUtils } from '../data-ingestion/collection.job.utils';
import { ProductJobUtils } from '../data-ingestion/product.job.utils';
import { RetailerService } from '../retailer/retailer.service';
import { ToolsService } from './tools.service';

@Resolver()
export class ToolsResolver {
    constructor(
        private readonly toolsService: ToolsService,
        private readonly retailerService: RetailerService,
        private readonly bulkOperationService: BulkOperationService,
    ) {}

    @Mutation(() => GraphQLBoolean)
    async sendAllRetailerToCloudshelf(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
    ): Promise<boolean> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        await this.toolsService.sendAllRetailersToCloudshelf();

        return true;
    }

    @Mutation(() => GraphQLBoolean)
    async getRetailerInfoWhereNull(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
    ): Promise<boolean> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        await this.toolsService.updateRetailerInfoWhereNull();

        return true;
    }
    @Query(() => GraphQLString)
    async viewConfig(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
    ): Promise<string> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        return JSON.stringify(process.env);
    }

    @Query(() => GraphQLString)
    async forceASafetySyncNow(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
    ): Promise<string> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }
        await this.toolsService.forceASafetySyncNow();

        return 'OK';
    }

    @Query(() => GraphQLString)
    async forceSync(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
        @Args({ name: 'domain', type: () => GraphQLString })
        domain: string,
        @Args({ name: 'partial', type: () => GraphQLBoolean, nullable: true })
        partial: boolean,
    ): Promise<string> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }
        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            return "false, retailer doesn't exist";
        }

        if (partial) {
            await ProductJobUtils.scheduleTriggerJob(retailer, false, 10, 'forceViaGql');
        } else {
            await ProductJobUtils.scheduleTriggerJob(retailer, true, undefined, 'forceViaGql');
        }
        return 'Scheduled a sync';
    }

    @Query(() => GraphQLString)
    async getWebhooksForRetailer(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
        @Args({ name: 'domain', type: () => GraphQLString })
        domain: string,
    ): Promise<string> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        const retailer = await this.retailerService.getByDomain(domain);

        if (!retailer) {
            return 'Cannot get retailer';
        }

        const webhooksForDomain = await this.toolsService.getWebhooks(retailer);

        return 'OK: ' + JSON.stringify(webhooksForDomain);
    }

    @Mutation(() => GraphQLBoolean)
    async reprocessBulkOperation(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
        @Args({ name: 'opId', type: () => GraphQLString })
        opId: string,
    ): Promise<boolean> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        const bulkOperation = await this.bulkOperationService.getOneById(opId);

        if (!bulkOperation) {
            console.info(`Bulk operation with id ${opId} not found`);
            return false;
        }

        const retailer = await this.retailerService.getByDomain(bulkOperation.domain);
        if (!retailer) {
            console.info(`Retailer with domain ${bulkOperation.domain} not found`);
            return false;
        }

        if (bulkOperation.type === BulkOperationType.ProductSync) {
            await ProductJobUtils.scheduleConsumerJob(retailer, bulkOperation);
        } else if (bulkOperation.type === BulkOperationType.ProductGroupSync) {
            await CollectionJobUtils.scheduleConsumerJob(retailer, bulkOperation, 'reprocessViaGql');
        }
        return true;
    }

    @Mutation(() => GraphQLString)
    async deleteAllWebhooks(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
        @Args({ name: 'from', type: () => GraphQLInt })
        from: number,
        @Args({ name: 'limit', type: () => GraphQLInt })
        limit: number,
    ) {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        const result = await this.toolsService.deleteAllWebhooksForAllStores(from, limit);

        return 'OK: ' + JSON.stringify(result);
    }

    @Mutation(() => GraphQLString)
    async registerAllWebhooks(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
        @Args({ name: 'from', type: () => GraphQLInt })
        from: number,
        @Args({ name: 'limit', type: () => GraphQLInt })
        limit: number,
    ) {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        if (process.env.HOST === undefined) {
            return 'Error: No host.' + JSON.stringify(process.env.JOST);
        }

        const result = await this.toolsService.registerAllWebhooksForAllRetailers(from, limit);

        return `OK (${process.env.HOST}): ` + JSON.stringify(result);
    }
}

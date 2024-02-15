import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean, GraphQLInt } from 'graphql';
import { GraphQLString } from 'graphql/type';
import { DataIngestionService } from '../data-ingestion/data.ingestion.service';
import { ProductJobService } from '../data-ingestion/product/product.job.service';
import { RetailerService } from '../retailer/retailer.service';
import { ToolsService } from './tools.service';

@Resolver()
export class ToolsResolver {
    constructor(
        private readonly toolsService: ToolsService,
        private readonly retailerService: RetailerService,
        private readonly productJobService: ProductJobService,
        private readonly dataIngestionService: DataIngestionService,
    ) {}

    // @Query(() => GraphQLBoolean)
    // async test(): Promise<boolean> {
    //     await runTest();
    //     return true;
    // }

    @Query(() => GraphQLString)
    async forceASafetySyncNow(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
    ): Promise<string> {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }
        await this.dataIngestionService.createSafetySyncs();

        return 'OK';
    }

    @Query(() => GraphQLString)
    async forceSync(
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
            return "false, retailer doesn't exist";
        }

        await this.productJobService.scheduleTriggerJob(retailer, true, false);

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

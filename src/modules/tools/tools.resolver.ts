import { Logger } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean, GraphQLInt } from 'graphql';
import { GraphQLString } from 'graphql/type';
import { auth } from '@trigger.dev/sdk';
import { Telemetry } from 'src/decorators/telemetry';
import { SyncStyle } from 'src/trigger/syncOptions.type';
import { BulkOperationService } from '../data-ingestion/bulk.operation.service';
import { RetailerSyncJobUtils } from '../data-ingestion/retailersync.job.utils';
import { RetailerService } from '../retailer/retailer.service';
import { ToolsService } from './tools.service';

@Resolver()
export class ToolsResolver {
    private readonly logger = new Logger('ToolsResolver');

    constructor(
        private readonly toolsService: ToolsService,
        private readonly retailerService: RetailerService,
        private readonly bulkOperationService: BulkOperationService,
    ) {}

    @Telemetry('graphql.query.version', { isGraphQL: true })
    @Query(() => String, {
        name: 'version',
        description: 'Returns the current version and environment type of the API',
    })
    async version(): Promise<string> {
        const version = process.env.PACKAGE_VERSION || 'vUnknown';
        const environment = process.env.RELEASE_TYPE || 'development';
        const result = `${version} (${environment})`;
        this.logger.log(`GraphQL Version: ${result}`);
        return result;
    }

    @Telemetry('graphql.mutation.sendAllRetailerToCloudshelf', { isGraphQL: true })
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

    @Telemetry('graphql.mutation.getRetailerInfoWhereNull', { isGraphQL: true })
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

    @Telemetry('graphql.query.viewConfig', { isGraphQL: true })
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

    @Telemetry('graphql.query.forceASafetySyncNow', { isGraphQL: true })
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

    @Telemetry('graphql.query.forceSync', { isGraphQL: true })
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
            await RetailerSyncJobUtils.scheduleTriggerJob(retailer, SyncStyle.PARTIAL, 10, 'forceViaGql', {
                info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
                warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
                error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
            });
        } else {
            await RetailerSyncJobUtils.scheduleTriggerJob(retailer, SyncStyle.FULL, undefined, 'forceViaGql', {
                info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
                warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
                error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
            });
        }
        return 'Scheduled a sync';
    }

    @Telemetry('graphql.query.getWebhooksForRetailer', { isGraphQL: true })
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

    @Telemetry('graphql.mutation.deleteAllWebhooks', { isGraphQL: true })
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

    @Telemetry('graphql.mutation.registerAllWebhooks', { isGraphQL: true })
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

    @Telemetry('graphql.query.getTriggerPublicToken', { isGraphQL: true })
    @Query(() => GraphQLString)
    async getTriggerPublicToken(
        @Args({ name: 'token', type: () => GraphQLString })
        token: string,
    ) {
        if (process.env.TOOLS_TOKEN === undefined || token !== process.env.TOOLS_TOKEN) {
            throw new Error('Unauthorized access to tools graphql');
        }

        try {
            const publicToken = await auth.createPublicToken({
                scopes: {
                    read: {
                        tasks: [
                            `request-products`,
                            `process-products`,
                            `request-product-groups`,
                            `process-product-groups`,
                        ],
                        runs: true,
                    },
                },
                expirationTime: '10y',
            });

            return publicToken;
        } catch (err) {
            return 'ERR: ' + err.message;
        }
    }
}

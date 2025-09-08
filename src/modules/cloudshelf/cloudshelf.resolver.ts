import { Inject, Logger, forwardRef } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean } from 'graphql';
import { Telemetry } from 'src/decorators/telemetry';
import { SyncStyle } from 'src/trigger/syncOptions.type';
import { VerifyRequestIsFromCloudshelfAPI } from '../auth/verify-request-is-from-cloudshelf-api';
import { RetailerSyncJobUtils } from '../data-ingestion/retailersync.job.utils';
import { RetailerService } from '../retailer/retailer.service';
import { CloudshelfSyncOrganisationInput } from './types/cloudshelf.sync.organisation.input';

@Resolver()
export class CloudshelfResolver {
    private readonly logger = new Logger('CloudshelfResolver');
    constructor(
        @Inject(forwardRef(() => RetailerService))
        private readonly retailerService: RetailerService,
    ) {}

    @Telemetry('cloudshelf.syncOrganisation')
    @Mutation(() => GraphQLBoolean)
    @VerifyRequestIsFromCloudshelfAPI()
    async syncOrganisation(
        @Args({ name: 'input', type: () => CloudshelfSyncOrganisationInput }) input: CloudshelfSyncOrganisationInput,
    ) {
        const retailer = await this.retailerService.findOneByDomain(input.domainName);

        if (!retailer) {
            throw new Error(`Retailer not found for domain ${input.domainName}`);
        }

        const syncStyle = input.fullSync ? SyncStyle.FULL : SyncStyle.PARTIAL;
        await RetailerSyncJobUtils.scheduleTriggerJob(retailer, syncStyle, 1, input.reason, {
            info: (logMessage: string, ...args: any[]) => this.logger.log(logMessage, ...args),
            warn: (logMessage: string, ...args: any[]) => this.logger.warn(logMessage, ...args),
            error: (logMessage: string, ...args: any[]) => this.logger.error(logMessage, ...args),
        });

        return true;
    }
}

import { Inject, forwardRef } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean } from 'graphql';
import { Telemetry } from 'src/decorators/telemetry';
import { RetailerSyncJob } from 'src/trigger/data-ingestion/retailer_sync/retailer-sync-job';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';
import { VerifyRequestIsFromCloudshelfAPI } from '../auth/verify-request-is-from-cloudshelf-api';
import { RetailerService } from '../retailer/retailer.service';
import { CloudshelfSyncOrganisationInput } from './types/cloudshelf.sync.organisation.input';

@Resolver()
export class CloudshelfResolver {
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
        const tags = TriggerTagsUtils.createTags({
            domain: input.domainName,
            reason: input.reason,
        });

        const retailer = await this.retailerService.findOneByDomain(input.domainName);

        if (!retailer) {
            throw new Error(`Retailer not found for domain ${input.domainName}`);
        }

        await RetailerSyncJob.trigger(
            {
                organisationId: retailer.id,
                fullSync: !!input.fullSync,
            },
            { tags, delay: '1s', queue: 'ingestion', concurrencyKey: retailer.id },
        );

        return true;
    }
}

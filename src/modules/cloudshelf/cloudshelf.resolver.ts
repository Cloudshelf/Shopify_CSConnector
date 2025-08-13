import { Inject, forwardRef } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean } from 'graphql';
import { EntityManager } from '@mikro-orm/postgresql';
import { VerifyRequestIsFromCloudshelfAPI } from '../auth/verify-request-is-from-cloudshelf-api';
import { ProductJobUtils } from '../data-ingestion/product.job.utils';
import { RetailerService } from '../retailer/retailer.service';
import {
    CloudshelfCancelOrganisationsSyncInput,
    CloudshelfSyncOrganisationInput,
} from './types/cloudshelf.sync.organisation.input';
import { Telemetry } from 'src/decorators/telemetry';
import { RequestProductsTask } from 'src/trigger/data-ingestion/product/request-products';
import { ExtendedLogger } from 'src/utils/ExtendedLogger';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

@Resolver()
export class CloudshelfResolver {
    private logger = new ExtendedLogger();

    constructor(
        @Inject(forwardRef(() => RetailerService))
        private readonly retailerService: RetailerService,
        private readonly entityManager: EntityManager,
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

        await RequestProductsTask.trigger(
            {
                organisationId: retailer.id,
                fullSync: !!input.fullSync,
            },
            { tags, delay: '1s', queue: 'ingestion', concurrencyKey: retailer.id },
        );

        return true;
    }

    @Telemetry('cloudshelf.cancelOrganisationsSync')
    @Mutation(() => GraphQLBoolean)
    @VerifyRequestIsFromCloudshelfAPI()
    async cancelOrganisationsSync(
        @Args({ name: 'input', type: () => CloudshelfCancelOrganisationsSyncInput })
        input: CloudshelfCancelOrganisationsSyncInput,
    ) {
        try {
            const domainNames = (input.domainNames ?? []).map(d => d.toLowerCase());
            if (!domainNames.length) {
                return true;
            }
            await ProductJobUtils.cancelAllPendingJobs({
                domainNames: input.domainNames,
                entityManager: this.entityManager,
            });
            return true;
        } catch (err) {
            this.logger.error(err);
            return false;
        }
    }
}

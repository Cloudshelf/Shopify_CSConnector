import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { VerifyRequestIsFromCloudshelfAPI } from '../auth/verify-request-is-from-cloudshelf-api';
import { RetailerService } from '../retailer/retailer.service';
import { CloudshelfSyncOrganisationInput } from './types/cloudshelf.sync.organisation.input';
import { RequestProductsTask } from 'src/trigger/data-ingestion/product/request-products';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

@Resolver()
export class CloudshelfResolver {
    constructor(private readonly retailerService: RetailerService) {}

    @Mutation(() => Boolean)
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
}

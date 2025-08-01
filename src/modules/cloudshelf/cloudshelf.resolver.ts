import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthRequired } from '../auth/auth.guard';
import { RetailerService } from '../retailer/retailer.service';
import { CloudshelfSyncOrganisationInput } from './types/cloudshelf.sync.organisation.input';
import { RequestProductsTask } from 'src/trigger/data-ingestion/product/request-products';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

@Resolver()
export class CloudshelfResolver {
    constructor(private readonly retailerService: RetailerService) {}

    @Mutation(() => Boolean)
    @AuthRequired()
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
                fullSync: true,
            },
            { tags },
        );

        return true;
    }
}

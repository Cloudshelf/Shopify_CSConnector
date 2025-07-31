import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { OrganisationStatus } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { AuthRequired } from '../auth/auth.guard';
import { RetailerService } from '../retailer/retailer.service';
import { CloudshelfApiOrganisationUtils } from './cloudshelf.api.organisation.util';
import { CloudshelfSyncOrganisationInput } from './types/cloudshelf.sync.organisation.input';
import { SyncLocationsTask } from 'src/trigger/data-ingestion/location/sync-locations';
import { ProcessProductGroupsTask } from 'src/trigger/data-ingestion/product-groups/process-product-groups';
import { RequestProductsTask } from 'src/trigger/data-ingestion/product/request-products';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';
import { ulid } from 'ulid';

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

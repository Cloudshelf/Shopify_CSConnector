import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean, GraphQLString } from 'graphql/type';
import { VerifyRequestIsFromCloudshelfAPI } from '../auth/verify-request-is-from-cloudshelf-api';
import { CloudshelfCancelOrganisationsSyncInput } from '../cloudshelf/types/cloudshelf.sync.organisation.input';
import { RetailerEntity } from './retailer.entity';
import { RetailerService } from './retailer.service';
import { Telemetry } from 'src/decorators/telemetry';
import { ExtendedLogger } from 'src/utils/ExtendedLogger';

@Resolver(() => RetailerEntity)
export class RetailerEntityResolver {
    private logger = new ExtendedLogger();

    constructor(private readonly retailerService: RetailerService) {}
    // @Query(() => RetailerEntity, { description: 'Returns a retailer entity', nullable: true })
    // async retailerEntity(
    //     @Args({ name: 'id', type: () => GraphQLString })
    //     id: string,
    // ): Promise<RetailerEntity | null> {
    //     return null;
    // }

    @Telemetry('retailer.cancelOrganisationsSync')
    @Mutation(() => GraphQLBoolean)
    @VerifyRequestIsFromCloudshelfAPI()
    async cancelOrganisationsSync(
        @Args({ name: 'input', type: () => CloudshelfCancelOrganisationsSyncInput })
        input: CloudshelfCancelOrganisationsSyncInput,
    ) {
        try {
            const domainNames = (input.domainNames ?? []).map(d => d.toLowerCase());
            if (!domainNames.length) {
                this.logger.debug('No domain names provided');
                return true;
            }

            if (input.markAsIdle) {
                await this.retailerService.markRetailersAsIdle(domainNames);
            }

            await this.retailerService.cancelTriggersForRetailers(domainNames);

            return true;
        } catch (err) {
            this.logger.error(`Error cancelling organisations sync: ${err}`);
            return false;
        }
    }

    @Telemetry('retailer.markRetailersAsActive')
    @Mutation(() => GraphQLBoolean)
    @VerifyRequestIsFromCloudshelfAPI()
    async markRetailersAsActive(@Args({ name: 'domain', type: () => GraphQLString }) domain: string) {
        return this.retailerService.markRetailersAsActive(domain);
    }
}

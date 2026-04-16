import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean, GraphQLString } from 'graphql/type';
import { Telemetry } from 'src/decorators/telemetry';
import { ExtendedLogger } from 'src/utils/ExtendedLogger';
import { VerifyRequestIsFromCloudshelfAPI } from '../auth/verify-request-is-from-cloudshelf-api';
import { CloudshelfCancelOrganisationsSyncInput } from '../cloudshelf/types/cloudshelf.sync.organisation.input';
import { CloudshelfUnregisterWebhooksInput } from '../cloudshelf/types/cloudshelf.unregister.webhooks.input';
import { deleteAllWebhooksForRetailer } from '../tools/utils/deleteAllWebhooksForRetailer';
import { RetailerEntity } from './retailer.entity';
import { RetailerService } from './retailer.service';

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

    @Telemetry('retailer.unregisterWebhooksForOrganisations')
    @Mutation(() => GraphQLBoolean)
    @VerifyRequestIsFromCloudshelfAPI()
    async unregisterWebhooksForOrganisations(
        @Args({ name: 'input', type: () => CloudshelfUnregisterWebhooksInput })
        input: CloudshelfUnregisterWebhooksInput,
    ) {
        try {
            const domainNames = (input.domainNames ?? []).map(d => d.toLowerCase());
            if (!domainNames.length) {
                this.logger.debug('No domain names provided');
                return true;
            }
            for (const domain of domainNames) {
                const retailer = await this.retailerService.getByDomain(domain);
                if (!retailer) {
                    this.logger.warn(`Retailer not found for domain: ${domain}`);
                    continue;
                }
                try {
                    await deleteAllWebhooksForRetailer(retailer);
                } catch (e) {
                    this.logger.error(`Error unregistering webhooks for ${domain}: ${e}`);
                    throw e;
                }
            }
            return true;
        } catch (err) {
            this.logger.error(`Error unregistering webhooks: ${err}`);
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

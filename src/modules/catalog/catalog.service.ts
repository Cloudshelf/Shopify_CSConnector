import { Injectable, Logger } from '@nestjs/common';
import { Telemetry } from 'src/decorators/telemetry';
import { RetailerService } from '../retailer/retailer.service';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import { AppCatalogsDocument, AppCatalogsQuery } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';

@Injectable()
export class CatalogService {
    private readonly logger = new Logger('CatalogService');

    constructor(private readonly retailerService: RetailerService) {}

    @Telemetry('service.catalog.getCatalogIdForRetailer')
    async getCatalogIdForRetailer(domain: string): Promise<string> {
        try {
            if (!domain) {
                this.logger.warn('No domain provided');
                return '-1';
            }

            const retailer = await this.retailerService.findOneByDomain(domain);
            if (!retailer) {
                this.logger.warn(`Retailer not found for domain: ${domain}`);
                return '-1';
            }

            const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer({ retailer });

            const response = await graphqlClient.query<AppCatalogsQuery>({
                query: AppCatalogsDocument,
            });

            if (response.errors && response.errors.length > 0) {
                this.logger.error(`GraphQL errors for domain ${domain}:`, response.errors);
                return '-1';
            }

            const catalogs = response.data?.catalogs?.nodes;
            if (!catalogs || catalogs.length === 0) {
                this.logger.warn(`No catalogs found for domain: ${domain}`);
                return '-1';
            }

            // Get the first catalog's ID and extract the numeric part
            const catalogGid = catalogs[0].id;
            const match = catalogGid.match(/gid:\/\/shopify\/Catalog\/(\d+)/);

            if (!match || !match[1]) {
                this.logger.error(`Failed to parse catalog GID: ${catalogGid}`);
                return '-1';
            }

            return match[1];
        } catch (error) {
            this.logger.error(`Error getting catalog ID for domain ${domain}:`, error);
            return '-1';
        }
    }
}

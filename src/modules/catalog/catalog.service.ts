import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApolloQueryResult } from '@apollo/client';
import { ShopifyGraphqlUtil } from '../shopify/shopify.graphql.util';
import {
    AppCatalogsDocument,
    AppCatalogsQuery,
    AppCatalogsQueryVariables,
} from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { Telemetry } from 'src/decorators/telemetry';
import { RetailerService } from '../retailer/retailer.service';

@Injectable()
export class CatalogService {
    private readonly logger = new Logger('CatalogService');

    constructor(private readonly retailerService: RetailerService, private readonly configService: ConfigService) {}

    private getValidCatalogTitles(): string[] {
        const releaseType = this.configService.get<string>('RELEASE_TYPE');
        if (releaseType === 'production') {
            return ['Cloudshelf', '52ed5683-9e5a-429f-8766-f5b38720e81d'];
        }
        return ['Kloudshelf'];
    }

    @Telemetry('service.catalog.getCatalogIdForRetailer')
    async getCatalogIdForRetailer(domain: string): Promise<string> {
        try {
            if (!domain) {
                this.logger.warn('No domain provided');
                return '-1/no-domain';
            }

            const retailer = await this.retailerService.findOneByDomain(domain);
            if (!retailer) {
                this.logger.warn(`Retailer not found for domain: ${domain}`);
                return '-1/retailer-not-found';
            }

            const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer({ retailer });
            const validTitles = this.getValidCatalogTitles();
            const validTitlesLower = validTitles.map(t => t.toLowerCase());
            let hasNextPage = true;
            let cursor: string | null = null;
            const allResponses: AppCatalogsQuery[] = [];

            this.logger.log(`Searching for catalogs with titles: ${validTitles.join(', ')}`);

            // Pagination loop
            do {
                const response: ApolloQueryResult<AppCatalogsQuery> = await graphqlClient.query<
                    AppCatalogsQuery,
                    AppCatalogsQueryVariables
                >({
                    query: AppCatalogsDocument,
                    variables: { after: cursor },
                });

                if (response.data) {
                    allResponses.push(response.data);
                }

                if (response.errors && response.errors.length > 0) {
                    this.logger.error(`GraphQL errors for domain ${domain}:`, response.errors);
                    return `-1/graphql-errors/${JSON.stringify({ errors: response.errors, responses: allResponses })}`;
                }

                const catalogs = response.data?.catalogs?.nodes ?? [];

                if (catalogs.length === 0 && !cursor) {
                    this.logger.warn(`No catalogs found for domain: ${domain}`);
                    return `-1/no-catalogs/${JSON.stringify(allResponses)}`;
                }

                this.logger.log(`Found ${catalogs.length} catalogs on current page`);

                // Find matching catalog by title (case-insensitive)
                const matchingCatalog = catalogs.find(catalog =>
                    validTitlesLower.includes(catalog.title.toLowerCase()),
                );

                if (matchingCatalog) {
                    this.logger.log(`Found matching catalog: ${matchingCatalog.title} (${matchingCatalog.id})`);

                    // Extract ID from GID (handles AppCatalog, CompanyLocationCatalog, MarketCatalog, etc.)
                    const match = matchingCatalog.id.match(/gid:\/\/shopify\/\w+Catalog\/(\d+)/);

                    if (match?.[1]) {
                        return match[1];
                    }

                    this.logger.error(`Failed to parse catalog GID: ${matchingCatalog.id}`);
                    const gidErrorData = {
                        gid: matchingCatalog.id,
                        responses: allResponses,
                    };
                    return `-1/failed-to-parse-catalog-gid/${JSON.stringify(gidErrorData)}`;
                }

                // Continue pagination
                hasNextPage = response.data?.catalogs?.pageInfo?.hasNextPage ?? false;
                cursor = response.data?.catalogs?.pageInfo?.endCursor ?? null;
            } while (hasNextPage);

            // No matching catalog found after checking all pages
            this.logger.warn(
                `No matching catalog found for domain: ${domain}. Valid titles: ${validTitles.join(', ')}`,
            );
            return `-1/no-matching-catalog/${JSON.stringify({ validTitles, responses: allResponses })}`;
        } catch (error) {
            this.logger.error(`Error getting catalog ID for domain ${domain}:`, error);
            return `-1/error-getting-catalog-id/${error}`;
        }
    }
}

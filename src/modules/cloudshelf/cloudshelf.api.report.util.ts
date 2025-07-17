import {
    MarkUninstalledDocument,
    MarkUninstalledMutation,
    MarkUninstalledMutationVariables,
    OrderLineInput,
    OrderStatus,
    ReportCatalogStatsDocument,
    ReportCatalogStatsMutation,
    ReportCatalogStatsMutationVariables,
    UpsertOrdersDocument,
    UpsertOrdersMutation,
    UpsertOrdersMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { CryptographyUtils } from '../../utils/CryptographyUtils';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiReportUtils {
    static async reportUninstall(apiUrl: string, domain: string, logs?: LogsInterface): Promise<void> {
        const timestamp = new Date().getTime().toString();
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain, logs);
        const reportUninstallMutation = await authedClient.mutate<
            MarkUninstalledMutation,
            MarkUninstalledMutationVariables
        >({
            mutation: MarkUninstalledDocument,
            variables: {
                input: {
                    domain,
                },
                hmac: CryptographyUtils.createHmac(domain, timestamp),
                nonce: timestamp,
            },
        });

        if (reportUninstallMutation.errors) {
            logs?.error?.(`Failed to report uninstall ${domain}`);
            return;
        }

        // Remove client from cache on uninstall
        CloudshelfApiAuthUtils.clearClientCache(apiUrl, domain);
    }

    static async reportCatalogStats(
        apiURL: string,
        domain: string,
        input: {
            knownNumberOfProductGroups?: number;
            knownNumberOfProducts?: number;
            knownNumberOfProductVariants?: number;
            knownNumberOfImages?: number;
            storeClosed?: boolean;
        },
        logs?: LogsInterface,
    ) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, domain, logs);

        const mutationTuple = await authedClient.mutate<
            ReportCatalogStatsMutation,
            ReportCatalogStatsMutationVariables
        >({
            mutation: ReportCatalogStatsDocument,
            variables: {
                knownNumberOfProductGroups: input.knownNumberOfProductGroups,
                knownNumberOfProducts: input.knownNumberOfProducts,
                knownNumberOfProductVariants: input.knownNumberOfProductVariants,
                knownNumberOfImages: input.knownNumberOfImages,
                retailerClosed: input.storeClosed,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to report catalog stats ${domain}`, { errors: mutationTuple.errors });
        }

        logs?.info?.(`reported stats :' + inspect(mutationTuple)`);
    }

    static async reportOrderStatus(
        apiURL: string,
        domain: string,
        shopifyCartId: string | undefined,
        status: OrderStatus,
        shopifyOrderId: string,
        fromPos: boolean,
        sessionId?: string,
        lines?: OrderLineInput[],
        logs?: LogsInterface,
    ) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, domain, logs);

        const variables: UpsertOrdersMutationVariables = {
            input: [
                {
                    newThirdPartyId: shopifyOrderId,
                    thirdPartyId: shopifyCartId,
                    status: status,
                    lines: lines,
                    fromPOS: fromPos,
                    sessionId: sessionId,
                },
            ],
        };

        logs?.info(`Sending payload to API for Upset Orders`, variables);

        const mutationTuple = await authedClient.mutate<UpsertOrdersMutation, UpsertOrdersMutationVariables>({
            mutation: UpsertOrdersDocument,
            variables: variables,
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to report order status ${domain}`, { errors: mutationTuple.errors });
        }

        logs?.info(`Order status update response:`, mutationTuple);
    }
}

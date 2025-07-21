import {
    RequestShopifySubscriptionCheckDocument,
    RequestShopifySubscriptionCheckMutation,
    RequestShopifySubscriptionCheckMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiSubscriptionUtils {
    static async requestSubscriptionCheck(apiURL: string, retailer: RetailerEntity, id: string, logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, retailer.domain, logs);

        const mutationTuple = await authedClient.mutate<
            RequestShopifySubscriptionCheckMutation,
            RequestShopifySubscriptionCheckMutationVariables
        >({
            mutation: RequestShopifySubscriptionCheckDocument,
            variables: {
                shopifyGid: id,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to request subscription update ${retailer.domain}`, { errors: mutationTuple.errors });
        }
    }
}

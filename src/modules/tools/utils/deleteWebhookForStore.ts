import {
    DeleteWebhookDocument,
    DeleteWebhookMutation,
    DeleteWebhookMutationVariables,
} from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyGraphqlUtil } from '../../shopify/shopify.graphql.util';
import { LogsInterface } from '../../cloudshelf/logs.interface';
import { RetailerEntity } from '../../retailer/retailer.entity';

export async function deleteWebhookForStore(retailer: RetailerEntity, webhookId: string, logs?: LogsInterface) {
    const authedClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

    const resp = await authedClient.mutate<DeleteWebhookMutation, DeleteWebhookMutationVariables>({
        mutation: DeleteWebhookDocument,
        variables: {
            id: webhookId,
        },
    });
    if (!resp.data || resp.errors) {
        return false;
    }

    return true;
}

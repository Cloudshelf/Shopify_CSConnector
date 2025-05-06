import { OrderLineInput, OrderStatus } from '../../../graphql/cloudshelf/generated/cloudshelf';
import { OrderFinancialStatus } from '../../../graphql/shopifyStorefront/generated/shopifyStorefront';
import { ShopifyGraphqlUtil } from '../../../modules/shopify/shopify.graphql.util';
import {
    DraftOrderDeleteDocument,
    DraftOrderDeleteMutation,
    DraftOrderDeleteMutationVariables,
    OrderUpdateDocument,
    OrderUpdateMutation,
    OrderUpdateMutationVariables,
} from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { CloudshelfApiUtils } from '../../../modules/cloudshelf/cloudshelf.api.util';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import {
    CLOUDSHELF_DEVICE_ATTRIBUTE,
    CLOUDSHELF_DRAFT_ORDER_ID,
    CLOUDSHELF_ORDER_ATTRIBUTE,
    CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE,
    CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE,
    CLOUDSHELF_SESSION_ATTRIBUTE,
    OrderUpdateWebhookPayload,
} from '../../../modules/shopify/webhooks/attrs.cosnts';
import { AppDataSource } from '../../../trigger/reuseables/orm';
import { logger, task } from '@trigger.dev/sdk/v3';

export const ProcessOrderTask = task({
    id: 'process-order',
    queue: {
        name: `order-processing`,
        concurrencyLimit: 1,
    },
    run: async (payload: { organisationId: string; data: OrderUpdateWebhookPayload }, { ctx }) => {
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }

        const cloudshelfAPI = process.env.CLOUDSHELF_API_URL;

        if (!cloudshelfAPI) {
            logger.error(`CLOUDSHELF_API_URL is not set`);
            throw new Error(`CLOUDSHELF_API_URL is not set`);
        }

        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        const retailer = await em.findOne(RetailerEntity, { id: payload.organisationId });

        if (!retailer) {
            logger.error(`Retailer does not exist for id "${payload.organisationId}"`);
            throw new Error(`Retailer does not exist for id "${payload.organisationId}"`);
        }

        const cloudshelfAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_ORDER_ATTRIBUTE);
        const deviceAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_DEVICE_ATTRIBUTE);
        const originatingStoreAttribute = payload.data.note_attributes.find(
            x => x.name === CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE,
        );
        const salesAssistantAttribute = payload.data.note_attributes.find(
            x => x.name === CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE,
        );
        const sessionAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_SESSION_ATTRIBUTE);
        const shopifyCartGid = `gid://shopify/Cart/${payload.data.cart_token}`;

        logger.info('Order ID: ' + payload.data.admin_graphql_api_id);
        logger.info('Order for cartID: ' + shopifyCartGid);
        logger.info('payload data', { data: payload.data });

        let cloudshelfStatus: OrderStatus = OrderStatus.DraftBasket;

        if (
            payload.data.financial_status.toLowerCase() === OrderFinancialStatus.Pending.toLowerCase() ||
            payload.data.financial_status.toLowerCase() === OrderFinancialStatus.Authorized.toLowerCase()
        ) {
            cloudshelfStatus = OrderStatus.Placed;
        } else if (payload.data.financial_status.toLowerCase() === OrderFinancialStatus.Refunded.toLowerCase()) {
            cloudshelfStatus = OrderStatus.Refunded;
        } else if (
            payload.data.financial_status.toLowerCase() === OrderFinancialStatus.PartiallyRefunded.toLowerCase()
        ) {
            cloudshelfStatus = OrderStatus.PartiallyRefunded;
        } else if (payload.data.financial_status.toLowerCase() === OrderFinancialStatus.Paid.toLowerCase()) {
            cloudshelfStatus = OrderStatus.Paid;
        }

        if (cloudshelfStatus === OrderStatus.DraftBasket) {
            logger.warn(
                'Order is in DraftBasket status, which it cannot be at this stage. Shopify Status: ' +
                    payload.data.financial_status,
            );
            return;
        }

        logger.info('cloudshelfStatus', { status: cloudshelfStatus });

        const orderLines: OrderLineInput[] = [];

        for (const line of payload.data.line_items) {
            orderLines.push({
                quantity: line.quantity,
                productID: `gid://external/ShopifyProduct/${line.product_id.toString()}`,
                productVariantID: `gid://external/ShopifyProductVariant/${line.variant_id.toString()}`,
                price: parseFloat(line.price),
                // @ts-ignore
                currencyCode: payload.data.currency,
            });
        }

        const draftorderNoteAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_DRAFT_ORDER_ID);
        logger.info(`Order Lines: ${orderLines.length}`, { lines: orderLines });
        //Possible todo: move this to a trigger task and.
        //Possible todo: have the connector create an order if it doesnt already exist (offline cloudshelves)
        await CloudshelfApiUtils.reportOrderStatus(
            cloudshelfAPI,
            retailer.domain,
            shopifyCartGid,
            cloudshelfStatus,
            payload.data.admin_graphql_api_id,
            draftorderNoteAttribute !== undefined,
            sessionAttribute?.value ?? undefined,
            orderLines.length > 0 ? orderLines : undefined,
        );

        //Now delete the draft order from shopify (if it exists in the notes)
        if (draftorderNoteAttribute) {
            logger.info(
                'Order was creafted by POS, and has a draft order id attached. We have to delete the draft order.',
                { draftOrderId: draftorderNoteAttribute.value },
            );
            const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);
            const result = await graphqlClient.mutate<DraftOrderDeleteMutation, DraftOrderDeleteMutationVariables>({
                mutation: DraftOrderDeleteDocument,
                variables: {
                    input: {
                        id: draftorderNoteAttribute.value,
                    },
                },
            });

            if (result.errors) {
                logger.error('Failed to delete draft order', {
                    errors: result.errors,
                    draftOrderId: draftorderNoteAttribute.value,
                });
            } else if (result.data?.draftOrderDelete?.deletedId) {
                logger.info('Successfully deleted draft order', {
                    deletedId: result.data.draftOrderDelete.deletedId,
                });
            }

            // Update the order note to indicate it originated from Cloudshelf
            // const orderUpdateResult = await graphqlClient.mutate<OrderUpdateMutation, OrderUpdateMutationVariables>({
            //     mutation: OrderUpdateDocument,
            //     variables: {
            //         input: {
            //             id: payload.data.admin_graphql_api_id,
            //             note: 'This order originated on a Cloudshelf Kiosk, and was transfered to POS for completion',
            //         },
            //     },
            // });

            // if (orderUpdateResult.errors) {
            //     logger.error('Failed to update order note', {
            //         errors: orderUpdateResult.errors,
            //         orderId: payload.data.admin_graphql_api_id,
            //     });
            // } else if (orderUpdateResult.data?.orderUpdate?.order) {
            //     logger.info('Successfully updated order note', {
            //         orderId: orderUpdateResult.data.orderUpdate.order.id,
            //     });
            // }
        }
    },
});

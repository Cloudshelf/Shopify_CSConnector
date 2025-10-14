import { OrderLineInput, OrderStatus } from '../../../graphql/cloudshelf/generated/cloudshelf';
import { OrderFinancialStatus } from '../../../graphql/shopifyStorefront/generated/shopifyStorefront';
import { ShopifyGraphqlUtil } from '../../../modules/shopify/shopify.graphql.util';
import {
    DraftOrderDeleteDocument,
    DraftOrderDeleteMutation,
    DraftOrderDeleteMutationVariables,
    GetOrderBasicsDocument,
    GetOrderBasicsQuery,
    GetOrderBasicsQueryVariables,
    OrderInput,
    OrderUpdateDocument,
    OrderUpdateMutation,
    OrderUpdateMutationVariables,
} from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { logger, task } from '@trigger.dev/sdk';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import { OrderProcessingQueue } from 'src/trigger/queues';
import { RetailerEntity } from '../../../modules/retailer/retailer.entity';
import {
    CLOUDSHELF_DEVICE_ATTRIBUTE,
    CLOUDSHELF_DRAFT_ORDER_ID,
    CLOUDSHELF_EMAIL,
    CLOUDSHELF_ORDER_ATTRIBUTE,
    CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE,
    CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE,
    CLOUDSHELF_SESSION_ATTRIBUTE,
    OrderUpdateWebhookPayload,
} from '../../../modules/shopify/webhooks/attrs.cosnts';
import { getDbForTrigger } from '../../reuseables/initialization';

export const ProcessOrderTask = task({
    id: 'process-order',
    queue: OrderProcessingQueue,
    machine: 'small-1x',
    run: async (payload: { organisationId: string; data: OrderUpdateWebhookPayload }, { ctx }) => {
        const AppDataSource = getDbForTrigger();
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }

        const cloudshelfAPI = process.env.CLOUDSHELF_API_URL;

        if (!cloudshelfAPI) {
            logger.error(`CLOUDSHELF_API_URL is not set`);
            throw new Error(`CLOUDSHELF_API_URL is not set`);
        }

        const em = AppDataSource.fork({
            flushMode: FlushMode.COMMIT,
        });

        const retailer = await em.findOne(RetailerEntity, { id: payload.organisationId });

        if (!retailer) {
            logger.error(`Retailer does not exist for id "${payload.organisationId}"`);
            throw new Error(`Retailer does not exist for id "${payload.organisationId}"`);
        }

        // if(payload.data.source_name === 'pos') {
        //     //100% from pos
        // }

        const cloudshelfAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_ORDER_ATTRIBUTE);
        const deviceAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_DEVICE_ATTRIBUTE);
        const originatingStoreAttribute = payload.data.note_attributes.find(
            x => x.name === CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE,
        );
        const salesAssistantAttribute = payload.data.note_attributes.find(
            x => x.name === CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE,
        );
        const sessionAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_SESSION_ATTRIBUTE);
        const shopifyCartGid = payload.data.cart_token ? `gid://shopify/Cart/${payload.data.cart_token}` : undefined;
        const emailAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_EMAIL);

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
            logger.info('line of line_items', { line: line });

            if (!line.product_exists && !line.product_id && !line.variant_id && line.name) {
                //we can assume its a shipping line
                orderLines.push({
                    quantity: line.quantity,
                    price: parseFloat(line.price),
                    // @ts-ignore
                    currencyCode: payload.data.currency,
                });
            } else {
                orderLines.push({
                    quantity: line.quantity,
                    productID: `gid://external/ShopifyProduct/${line.product_id.toString()}`,
                    productVariantID: `gid://external/ShopifyProductVariant/${line.variant_id.toString()}`,
                    price: parseFloat(line.price),
                    // @ts-ignore
                    currencyCode: payload.data.currency,
                });
            }
        }

        const draftorderNoteAttribute = payload.data.note_attributes.find(x => x.name === CLOUDSHELF_DRAFT_ORDER_ID);
        logger.info(`Order Lines: ${orderLines.length}`);

        let validSessionId: string | undefined = undefined;

        if (sessionAttribute?.value) {
            if (sessionAttribute?.value?.startsWith('gid://')) {
                validSessionId = sessionAttribute.value;
            }
        }

        logger.info('reportOrderStatus payloads', {
            api: cloudshelfAPI,
            retailerDomain: retailer.domain,
            shopifyCartGid: shopifyCartGid,
            cloudshelfStatus: cloudshelfStatus,
            admin_graphql_api_id: payload.data.admin_graphql_api_id,
            fromPOS: draftorderNoteAttribute !== undefined,
            sessionId: validSessionId,
            orderLines: orderLines,
        });

        //Possible todo: have the connector create an order if it doesnt already exist (offline cloudshelves)
        await CloudshelfApiReportUtils.reportOrderStatus(
            cloudshelfAPI,
            retailer.domain,
            shopifyCartGid,
            cloudshelfStatus,
            payload.data.admin_graphql_api_id,
            draftorderNoteAttribute !== undefined,
            validSessionId,
            orderLines.length > 0 ? orderLines : undefined,
            {
                info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
                warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
                error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
            },
        );

        logger.info(`Reported Order Status!`);

        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer({ retailer });
        //Now delete the draft order from shopify (if it exists in the notes)
        if (draftorderNoteAttribute) {
            logger.info(
                'Order was creafted by POS, and has a draft order id attached. We have to delete the draft order.',
                { draftOrderId: draftorderNoteAttribute.value },
            );

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
        }

        if (validSessionId) {
            //If theres a session, we can assume it came from cloudshelf
            const canUseWriteOrders = await retailer.supportsWriteOrders();
            if (canUseWriteOrders) {
                //First get the current order tags
                const orderResult = await graphqlClient.query<GetOrderBasicsQuery, GetOrderBasicsQueryVariables>({
                    query: GetOrderBasicsDocument,
                    variables: {
                        id: payload.data.admin_graphql_api_id,
                    },
                });

                if (orderResult.errors) {
                    logger.error('Failed to get order tags', {
                        errors: orderResult.errors,
                        orderId: payload.data.admin_graphql_api_id,
                    });
                }

                let existingNote = orderResult.data?.order?.note ?? '';

                if (payload.data.source_name === 'pos') {
                    if (
                        !existingNote
                            .toLowerCase()
                            .startsWith(
                                'this order originated on a cloudshelf kiosk, and was transfered to pos for completion.',
                            )
                    ) {
                        existingNote =
                            'This order originated on a Cloudshelf Kiosk, and was transfered to POS for completion.' +
                            (existingNote ? '\n\n' + existingNote : '');
                    }
                }

                const existingTags = orderResult.data?.order?.tags ?? [];

                //Add Cloudshelf tag if it doesn't already exist
                const tags = [...existingTags];
                if (!tags.includes('Cloudshelf')) {
                    tags.push('Cloudshelf');
                }
                const hasEmail = orderResult.data?.order?.email != null;

                const orderInput: OrderInput = {
                    id: payload.data.admin_graphql_api_id,
                    note: existingNote,
                    tags: tags,
                    email: !hasEmail && emailAttribute ? emailAttribute.value : undefined,
                };

                logger.info(`Sending update order request with payload`, { data: JSON.stringify(orderInput) });
                //Update the order with the note to say it came from cloudshelf, the customer email (IF it was not already on the order, and add "Cloudshelf" as a tag)
                const orderUpdateResult = await graphqlClient.mutate<OrderUpdateMutation, OrderUpdateMutationVariables>(
                    {
                        mutation: OrderUpdateDocument,
                        variables: {
                            input: orderInput,
                        },
                    },
                );

                if (orderUpdateResult.errors) {
                    logger.error('Failed to update order', {
                        errors: orderUpdateResult.errors,
                        payload: orderInput,
                    });
                } else if (orderUpdateResult.data?.orderUpdate?.order) {
                    logger.info('Successfully updated order note', {
                        orderId: orderUpdateResult.data.orderUpdate.order.id,
                        payload: orderInput,
                    });
                }
            }
        }
    },
});

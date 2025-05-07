import { CurrencyCode, OrderFinancialStatus } from '../../../graphql/shopifyStorefront/generated/shopifyStorefront';

export const CLOUDSHELF_ORDER_ATTRIBUTE = 'CS_Cloudshelf';
export const CLOUDSHELF_DEVICE_ATTRIBUTE = 'CS_Device';
export const CLOUDSHELF_ORIGINATING_STORE_ATTRIBUTE = 'CS_OriginatingStore';
export const CLOUDSHELF_SALES_ASSISTANT_ATTRIBUTE = 'CS_SalesAssistant';
export const CLOUDSHELF_SESSION_ATTRIBUTE = 'CS_SessionId';
export const CLOUDSHELF_DRAFT_ORDER_ID = 'CS_DRAFT_ORDER_ID';
export const CLOUDSHELF_EMAIL = 'CS_EMAIL';
export const CLOUDSHELF_CUSTOMER = 'CS_CUSTOMER';

export interface OrderUpdateWebhookPayload {
    id: number;
    admin_graphql_api_id: string;
    checkout_id: number;
    cart_token: string;
    financial_status: OrderFinancialStatus;
    note: string;
    currency: CurrencyCode;
    note_attributes: {
        name: string;
        value: string;
    }[];
    line_items: {
        quantity: number;
        product_id: number;
        variant_id: number;
        price: string;
    }[];
}

export interface CloudshelfDraftOrdersPayload {
    items: {
        cursor: string;
        node: CloudshelfDraftOrder;
    }[];
    pageInfo: {
        hasMore: boolean;
        nextPageCursor: string | undefined;
    };
}

export interface CloudshelfDraftOrder {
    id: string;
    shopifyDraftOrderCode: string;
    identifier: string;
    email: string | null;
    items: {
        variantId: number;
        quantity: number;
    }[];
    properties: {
        [key: string]: string;
    };
}

interface StockLocation {
    id: string;
    numberAvailable: number;
    displayName: string;
    // distance: string | null;
    // allowClickAndCollect: boolean;
}

interface StockCheckFor {
    productId: string | null;
    variantId: string;
    locationId: string | null;
}

interface StockCheckResponse {
    totalNumberAvailable: number;
    location: StockLocation | null;
    locations: StockLocation[];
    // availableToShip: number;
}

interface StockCheckResultPayload {
    dataType: 'StockLevels';
    dataTypeVersion: 1;
    responseFor: StockCheckFor;
    response: StockCheckResponse;
}

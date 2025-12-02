import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

export async function buildQueryInventoryItems(retailer: RetailerEntity, changesSince?: Date): Promise<string> {
    let queryString = '';
    const queryParts: string[] = [];

    if (changesSince !== undefined) {
        queryParts.push(`updated_at:>'${changesSince.toISOString()}'`);
    }

    if (queryParts.length > 0) {
        queryString = `(query: \"${queryParts.join(' AND ')}\")`;
    }

    return `{
    inventoryItems${queryString} {
        edges {
            node {
                id
                sku
                tracked
                variant {
                    id
                }
                inventoryLevels {
                  edges {
                     node {
                        id
                        location {
                            id
                        }
                        quantities(names: "available") {
                            id
                            name
                            quantity
                        }
                    }
                  }
                }
            }
        }
    }
}`;
}

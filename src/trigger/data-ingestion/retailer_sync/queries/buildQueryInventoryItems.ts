export async function buildQueryInventoryItems(): Promise<string> {
    return `{
    inventoryItems {
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

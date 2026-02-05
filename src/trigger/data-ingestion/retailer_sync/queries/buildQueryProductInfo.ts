import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

export async function buildQueryProductInfo(retailer: RetailerEntity, changesSince?: Date): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    let queryString = '';
    const queryParts: string[] = [];

    queryParts.push('status:ACTIVE');

    if (changesSince !== undefined) {
        queryParts.push(`updated_at:>'${changesSince.toISOString()}'`);
    }

    if (queryParts.length > 0) {
        queryString = `(query: \"${queryParts.join(' AND ')}\")`;
    }

    return `{
          products${queryString} {
            edges {
              node {
                id
                featuredImage {
                  url
                  id
                }
                images {
                  edges {
                    node {
                      id
                      url
                    }
                  }
                }
                status
                ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
                storefrontId
                title
                descriptionHtml
                handle
                productType
                tags
                vendor
                totalVariants
                updatedAt
                metafields {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                      description
                      createdAt
                      updatedAt
                    }
                  }
                }
                variants {
                  edges {
                    node {
                      id
                      title
                      image {
                        id
                        url
                      }
                      price
                      sku
                      barcode
                      compareAtPrice
                      availableForSale
                      inventoryPolicy
                      inventoryQuantity
                      selectedOptions {
                        name
                        value
                      }
                      inventoryItem {
                        id
                        tracked
                      }
                    }
                  }
                }
              }
            }
          }
        }`;
}

import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

export async function buildQueryCollectionInfo(retailer: RetailerEntity, changesSince?: Date): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    let queryString = '';
    const queryParts: string[] = [];

    //Status does not exist on collections
    // queryParts.push('status:ACTIVE');

    if (changesSince !== undefined) {
        queryParts.push(`updated_at:>'${changesSince.toISOString()}'`);
    }

    if (queryParts.length > 0) {
        queryString = `(query: \"${queryParts.join(' AND ')}\")`;
    }

    return `{
        collections${queryString}  {
          edges {
            node {
              id
              ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
              title
              handle
              image {
                url
              }
              storefrontId
              updatedAt
              products {
                edges {
                  node {
                    id
                    featuredImage {
                          url
                          id
                    }
                  }
                }
              }
            }
          }
        }
      }`;
}

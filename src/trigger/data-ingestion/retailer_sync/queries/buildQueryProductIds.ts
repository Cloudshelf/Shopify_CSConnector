import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

export async function buildQueryProductIds(retailer: RetailerEntity): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    let queryString = '';
    const queryParts: string[] = [];

    queryParts.push('status:ACTIVE');

    if (queryParts.length > 0) {
        queryString = `(query: \"${queryParts.join(' AND ')}\")`;
    }
    return `{
        products${queryString} {
          edges {
            node {
              id
              ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
              variants {
                  edges {
                    node {
                      id
                    }
                }
              }
            }
          }
        }
      }`;
}

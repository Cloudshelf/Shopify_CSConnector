import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

export async function buildQueryCollectionIds(retailer: RetailerEntity): Promise<string> {
    const withPublicationStatus = await retailer.supportsWithPublicationStatus();
    return `{
        collections {
          edges {
            node {
              id
              ${withPublicationStatus ? 'publishedOnCurrentPublication' : ''}
            }
          }
        }
      }`;
}

import { BulkOperation } from '../data-ingestion/bulk.operation.entity';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CustomTokenEntity } from '../shopify/sessions/custom.token.entity';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';

// Because we want to use trigger, we need to have all the database entites in one list.
export const AllDatabaseEntities = [BulkOperation, RetailerEntity, ShopifySessionEntity, CustomTokenEntity];

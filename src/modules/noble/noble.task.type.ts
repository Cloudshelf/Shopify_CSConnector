import { registerEnumType } from '@nestjs/graphql';

export enum NobleTaskType {
    Debug = 'DEBUG',
    DebugError = 'DEBUGERROR',
    SyncProductsTrigger = 'SYNC_PRODUCTS_TRIGGER',
    SyncProducts = 'SYNC_PRODUCTS',
    SyncCollectionsTrigger = 'SYNC_COLLECTIONS_TRIGGER',
    SyncCollections = 'SYNC_COLLECTIONS',
}

registerEnumType(NobleTaskType, {
    name: 'NobleTaskType',
});

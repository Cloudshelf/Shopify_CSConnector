import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CloudshelfModule } from '../cloudshelf/cloudshelf.module';
import { NobleModule } from '../noble/noble.module';
import { RetailerModule } from '../retailer/retailer.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { BulkOperation } from './bulk.operation.entity';
import { BulkOperationService } from './bulk.operation.service';
import { CollectionJobService } from './collection/collection.job.service';
import { CollectionsProcessor } from './collection/collections.processor';
import { LocationJobService } from './location/location.job.service';
import { LocationProcessor } from './location/location.processor';
import { ProductJobService } from './product/product.job.service';
import { ProductProcessor } from './product/product.processor';

@Module({
    imports: [
        MikroOrmModule.forFeature([BulkOperation]),
        forwardRef(() => ShopifyModule),
        NobleModule,
        RetailerModule,
        CloudshelfModule,
    ],
    providers: [
        CollectionsProcessor,
        ProductProcessor,
        BulkOperationService,
        ProductJobService,
        CollectionJobService,
        LocationJobService,
        LocationProcessor,
    ],
    controllers: [],
    exports: [
        CollectionsProcessor,
        ProductProcessor,
        BulkOperationService,
        ProductJobService,
        CollectionJobService,
        LocationJobService,
        LocationProcessor,
    ],
})
export class DataIngestionModule {}

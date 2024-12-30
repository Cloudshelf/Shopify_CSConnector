import { Module, forwardRef } from '@nestjs/common';
import { CloudshelfModule } from '../cloudshelf/cloudshelf.module';
import { RetailerModule } from '../retailer/retailer.module';
import { ShopifyModule } from '../shopify/shopify.module';
import { ToolsModule } from '../tools/tools.module';
import { BulkOperationService } from './bulk.operation.service';

@Module({
    imports: [forwardRef(() => ShopifyModule), RetailerModule, CloudshelfModule, ToolsModule],
    providers: [BulkOperationService],
    controllers: [],
    exports: [BulkOperationService],
})
export class DataIngestionModule {}

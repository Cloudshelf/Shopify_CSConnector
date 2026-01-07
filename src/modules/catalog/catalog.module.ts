import { Module } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
    imports: [RetailerModule],
    providers: [CatalogService],
    controllers: [CatalogController],
    exports: [CatalogService],
})
export class CatalogModule {}

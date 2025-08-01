import { Module } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { CloudshelfApiService } from './cloudshelf.api.service';
import { CloudshelfResolver } from './cloudshelf.resolver';

@Module({
    imports: [RetailerModule],
    providers: [CloudshelfApiService, CloudshelfResolver],
    controllers: [],
    exports: [CloudshelfApiService],
})
export class CloudshelfModule {}

import { Module } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { CloudshelfApiService } from './cloudshelf.api.service';

@Module({
    imports: [RetailerModule],
    providers: [CloudshelfApiService],
    controllers: [],
    exports: [CloudshelfApiService],
})
export class CloudshelfModule {}

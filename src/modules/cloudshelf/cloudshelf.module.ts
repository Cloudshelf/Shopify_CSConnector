import { Module, forwardRef } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { CloudshelfApiService } from './cloudshelf.api.service';
import { CloudshelfResolver } from './cloudshelf.resolver';

@Module({
    imports: [forwardRef(() => RetailerModule)],
    providers: [CloudshelfApiService, CloudshelfResolver],
    controllers: [],
    exports: [CloudshelfApiService],
})
export class CloudshelfModule {}

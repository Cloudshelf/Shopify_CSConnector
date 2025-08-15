import { Module, forwardRef } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { TriggerHandlersModule } from '../trigger-handlers/tigger-handlers.module';
import { CloudshelfApiService } from './cloudshelf.api.service';
import { CloudshelfResolver } from './cloudshelf.resolver';

@Module({
    imports: [forwardRef(() => RetailerModule), TriggerHandlersModule],
    providers: [CloudshelfApiService, CloudshelfResolver],
    controllers: [],
    exports: [CloudshelfApiService],
})
export class CloudshelfModule {}

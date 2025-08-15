import { Module, forwardRef } from '@nestjs/common';
import { CloudshelfModule } from '../cloudshelf/cloudshelf.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { TriggerHandlersModule } from '../trigger-handlers/tigger-handlers.module';
import { RetailerEntityResolver } from './retailer.resolver';
import { RetailerService } from './retailer.service';

@Module({
    imports: [IntegrationsModule, CloudshelfModule, TriggerHandlersModule],
    providers: [RetailerService, RetailerEntityResolver],
    controllers: [],
    exports: [RetailerService],
})
export class RetailerModule {}

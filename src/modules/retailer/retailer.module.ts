import { Module, forwardRef } from '@nestjs/common';
import { CloudshelfModule } from '../cloudshelf/cloudshelf.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { RetailerEntityResolver } from './retailer.resolver';
import { RetailerService } from './retailer.service';

@Module({
    imports: [IntegrationsModule, CloudshelfModule],
    providers: [RetailerService, RetailerEntityResolver],
    controllers: [],
    exports: [RetailerService],
})
export class RetailerModule {}

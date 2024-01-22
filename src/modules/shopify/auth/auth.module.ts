import { Module } from '@nestjs/common';
import { CloudshelfModule } from '../../cloudshelf/cloudshelf.module';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { RetailerModule } from '../../retailer/retailer.module';
import { SessionModule } from '../sessions/session.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { AfterAuthHandlerService } from './after.auth.service';

@Module({
    imports: [RetailerModule, IntegrationsModule, StorefrontModule, SessionModule, CloudshelfModule],
    providers: [AfterAuthHandlerService],
    exports: [AfterAuthHandlerService],
})
export class AuthModule {}

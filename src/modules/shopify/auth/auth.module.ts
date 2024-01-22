import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../../integrations/integrations.module';
import { RetailerModule } from '../../retailer/retailer.module';
import { StorefrontModule } from '../storefront/storefront.module';
import { AfterAuthHandlerService } from './after.auth.service';

@Module({
    imports: [RetailerModule, IntegrationsModule, StorefrontModule],
    providers: [AfterAuthHandlerService],
    exports: [AfterAuthHandlerService],
})
export class AuthModule {}

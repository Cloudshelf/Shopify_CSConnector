import { Module } from '@nestjs/common';
import { RetailerModule } from '../../retailer/retailer.module';
import { AfterAuthHandlerService } from './after.auth.service';

@Module({
    imports: [RetailerModule],
    providers: [AfterAuthHandlerService],
    exports: [AfterAuthHandlerService],
})
export class AuthModule {}

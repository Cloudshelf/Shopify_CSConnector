import { Module } from '@nestjs/common';
import { StorefrontService } from './storefront.service';

@Module({
    imports: [],
    providers: [StorefrontService],
    exports: [StorefrontService],
})
export class StorefrontModule {}

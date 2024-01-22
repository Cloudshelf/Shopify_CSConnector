import { Module } from '@nestjs/common';
import { CloudshelfApiService } from './cloudshelf.api.service';

@Module({
    imports: [],
    providers: [CloudshelfApiService],
    controllers: [],
    exports: [CloudshelfApiService],
})
export class CloudshelfModule {}

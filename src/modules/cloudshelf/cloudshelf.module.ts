import {forwardRef, Module} from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { CloudshelfApiService } from './cloudshelf.api.service';
import {RetailerService} from "../retailer/retailer.service";

@Module({
    imports: [forwardRef(() => RetailerModule)],
    providers: [CloudshelfApiService],
    controllers: [],
    exports: [CloudshelfApiService],
})
export class CloudshelfModule {}

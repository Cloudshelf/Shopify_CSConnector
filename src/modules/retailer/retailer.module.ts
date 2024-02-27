import {forwardRef, Module} from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RetailerEntity } from './retailer.entity';
import { RetailerEntityResolver } from './retailer.resolver';
import { RetailerService } from './retailer.service';
import { CloudshelfModule } from "../cloudshelf/cloudshelf.module";

@Module({
    imports: [MikroOrmModule.forFeature([RetailerEntity]), forwardRef(() => CloudshelfModule)],
    providers: [RetailerService, RetailerEntityResolver],
    controllers: [],
    exports: [RetailerService],
})
export class RetailerModule {}

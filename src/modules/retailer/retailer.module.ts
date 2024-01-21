import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RetailerEntity } from './retailer.entity';
import { RetailerEntityResolver } from './retailer.resolver';
import { RetailerService } from './retailer.service';

@Module({
    imports: [MikroOrmModule.forFeature([RetailerEntity])],
    providers: [RetailerService, RetailerEntityResolver],
    controllers: [],
    exports: [RetailerService],
})
export class RetailerModule {}

import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { IntegrationsModule } from '../integrations/integrations.module';
import { RetailerEntity } from './retailer.entity';
import { RetailerEntityResolver } from './retailer.resolver';
import { RetailerService } from './retailer.service';

@Module({
    imports: [MikroOrmModule.forFeature([RetailerEntity]), IntegrationsModule],
    providers: [RetailerService, RetailerEntityResolver],
    controllers: [],
    exports: [RetailerService],
})
export class RetailerModule {}

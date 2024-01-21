import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { DatabaseSessionStorage } from './database.session.storage';
import { ShopifySessionEntity } from './shopify.session.entity';

@Module({
    imports: [MikroOrmModule.forFeature([ShopifySessionEntity])],
    providers: [DatabaseSessionStorage],
    exports: [DatabaseSessionStorage],
})
export class SessionModule {}

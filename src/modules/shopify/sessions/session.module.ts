import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CustomTokenEntity } from './custom.token.entity';
import { CustomTokenService } from './custom.token.service';
import { DatabaseSessionStorage } from './database.session.storage';
import { ShopifySessionEntity } from './shopify.session.entity';

@Module({
    imports: [MikroOrmModule.forFeature([ShopifySessionEntity, CustomTokenEntity])],
    providers: [DatabaseSessionStorage, CustomTokenService],
    exports: [DatabaseSessionStorage, CustomTokenService],
})
export class SessionModule {}

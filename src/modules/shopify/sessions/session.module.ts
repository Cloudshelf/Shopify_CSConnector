import { Module } from '@nestjs/common';
import { CustomTokenService } from './custom.token.service';
import { DatabaseSessionStorage } from './database.session.storage';

@Module({
    imports: [],
    providers: [DatabaseSessionStorage, CustomTokenService],
    exports: [DatabaseSessionStorage, CustomTokenService],
})
export class SessionModule {}

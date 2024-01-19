import { Module, OnModuleInit } from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { ApiHealthModule } from './modules/api-health/api-health.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { DatabaseModule } from './modules/database/database.module';
import { TestModule } from './modules/test/test.module';
import { ClsModule } from 'nestjs-cls';
import { ulid } from 'ulid';

@Module({
    imports: [
        ClsModule.forRoot({
            global: true,
            middleware: {
                mount: true,
                generateId: true,
                idGenerator: (req: Request) => {
                    return req.headers.get('X-Request-Id') ?? `gid://cloudshelfShopifyConnector/request/${ulid()}`;
                },
            },
        }),
        ConfigurationModule,
        ApiHealthModule,
        DatabaseModule.register(),
        TestModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements OnModuleInit {
    constructor(private readonly orm: MikroORM) {}

    async onModuleInit(): Promise<void> {
        await this.orm.getMigrator().up();
        console.log('Random ULID: ', ulid());
    }
}

import { Module, OnModuleInit } from '@nestjs/common';
import { GraphQLModule } from './modules/graphql/graphql.module';
import { MikroORM } from '@mikro-orm/core';
import { ApiHealthModule } from './modules/api-health/api-health.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { DatabaseModule } from './modules/database/database.module';
import { RetailerModule } from './modules/retailer/retailer.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { TestModule } from './modules/test/test.module';
import { ExtendedLogger } from './utils/ExtendedLogger';
import { Request } from 'express';
import { ClsModule } from 'nestjs-cls';
import { ulid } from 'ulid';
import '@shopify/shopify-api/adapters/node';

@Module({
    imports: [
        ClsModule.forRoot({
            global: true,
            middleware: {
                mount: true,
                generateId: true,
                idGenerator: (req: Request) => {
                    const existingId = req.headers['X-Request-Id'];
                    if (Array.isArray(existingId) || !existingId) {
                        return ulid();
                    }
                    return existingId;
                },
            },
        }),
        ConfigurationModule,
        ApiHealthModule,
        DatabaseModule.register(),
        GraphQLModule.register(),
        RetailerModule,
        ShopifyModule.register(),

        TestModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements OnModuleInit {
    private readonly logger = new ExtendedLogger('AppModule');
    constructor(private readonly orm: MikroORM) {}

    async onModuleInit(): Promise<void> {
        await this.orm.getMigrator().up();
        this.logger.log(`Startup ULID: ${ulid()}`);
    }
}

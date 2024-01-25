import { Module, OnModuleInit, forwardRef } from '@nestjs/common';
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
import { CloudshelfModule } from './modules/cloudshelf/cloudshelf.module';
import { DataIngestionModule } from './modules/data-ingestion/data.ingestion.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ManagerProxyModule } from './modules/manager-proxy/manager-proxy.module';
import { NobleModule } from './modules/noble/noble.module';

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
        IntegrationsModule,
        ApiHealthModule,
        DataIngestionModule,
        DatabaseModule.register(),
        GraphQLModule.register(),
        ShopifyModule.register(),
        RetailerModule,
        ManagerProxyModule,
        CloudshelfModule,
        TestModule,
        NobleModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements OnModuleInit {
    private readonly logger = new ExtendedLogger('AppModule');
    constructor(private readonly orm: MikroORM) {}

    async onModuleInit(): Promise<void> {
        this.logger.log(`Running MikroOrm Migrator`);
        await this.orm.getMigrator().up();
    }
}

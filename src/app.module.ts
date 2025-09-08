import { Module, OnModuleInit } from '@nestjs/common';
import { GraphQLModule } from './modules/graphql/graphql.module';
import { MikroORM } from '@mikro-orm/core';
import { Request } from 'express';
import { ClsModule } from 'nestjs-cls';
import { ulid } from 'ulid';
import { ApiHealthModule } from './modules/api-health/api-health.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { DatabaseModule } from './modules/database/database.module';
import { RetailerModule } from './modules/retailer/retailer.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { ExtendedLogger } from './utils/ExtendedLogger';
import '@shopify/shopify-api/adapters/node';
import { ScheduleModule } from '@nestjs/schedule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CloudshelfModule } from './modules/cloudshelf/cloudshelf.module';
import { DataIngestionModule } from './modules/data-ingestion/data.ingestion.module';
import { AllDatabaseEntities } from './modules/database/entities';
import { EngineModule } from './modules/engine/engine.module';
import { ManagerProxyModule } from './modules/manager-proxy/manager-proxy.module';
import { POSModule } from './modules/pos/pos.module';
import { ToolsModule } from './modules/tools/tools.module';

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
        DataIngestionModule,
        DatabaseModule.register(),
        GraphQLModule.register(),
        ShopifyModule.register(),
        RetailerModule,
        ManagerProxyModule,
        CloudshelfModule,
        ToolsModule,
        EngineModule,
        POSModule,
        ScheduleModule.forRoot(),
        MikroOrmModule.forFeature(AllDatabaseEntities),
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

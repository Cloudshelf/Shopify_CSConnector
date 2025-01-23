import { Module, OnModuleInit } from '@nestjs/common';
import { GraphQLModule } from './modules/graphql/graphql.module';
import { MikroORM } from '@mikro-orm/core';
import { ApiHealthModule } from './modules/api-health/api-health.module';
import { ConfigurationModule } from './modules/configuration/configuration.module';
import { DatabaseModule } from './modules/database/database.module';
import { RetailerModule } from './modules/retailer/retailer.module';
import { ShopifyModule } from './modules/shopify/shopify.module';
import { ExtendedLogger } from './utils/ExtendedLogger';
import { Request } from 'express';
import { ClsModule } from 'nestjs-cls';
import { ulid } from 'ulid';
import '@shopify/shopify-api/adapters/node';
import { ScheduleModule } from '@nestjs/schedule';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CloudshelfModule } from './modules/cloudshelf/cloudshelf.module';
import { DataIngestionModule } from './modules/data-ingestion/data.ingestion.module';
import { AllDatabaseEntities } from './modules/database/entities';
import { ManagerProxyModule } from './modules/manager-proxy/manager-proxy.module';
import { ToolsModule } from './modules/tools/tools.module';
import { LoggerModule } from 'nestjs-pino';

@Module({
    imports: [
        LoggerModule.forRoot({
            pinoHttp: {
                genReqId: req => {
                    let id = req.headers['X-Request-Id'];
                    if (Array.isArray(id) || !id) {
                        id = ulid();
                    }

                    req.headers['X-Request-Id'] = id;

                    return id;
                },
                customProps: (req, res) => {
                    return { ATTR_SERVICE_NAME: 'Connector_Shopify' };
                },
                level: 'debug',
                autoLogging: false,
                transport: {
                    targets: [
                        {
                            target: 'pino-pretty',
                            options: {
                                colorize: true,
                                singleLine: true,
                                levelFirst: false,
                                translateTime: "yyyy-mm-dd'T'HH:MM:ss.l'Z'",
                                messageFormat: `{if req.id}({req.id}){end} {if context}[{context}]{end} {msg}`,
                            },
                        },
                        {
                            target: '@axiomhq/pino',
                            options: {
                                dataset: 'cloudshelf',
                                token: '', //todo: add token from env
                            },
                        },
                    ],
                },
            },
        }),
        ClsModule.forRoot({
            global: true,
            middleware: {
                mount: true,
                generateId: true,
                idGenerator: (req: Request) => {
                    let id = req.headers['X-Request-Id'];
                    if (Array.isArray(id) || !id) {
                        id = ulid();
                    }

                    req.headers['X-Request-Id'] = id;

                    return id;
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

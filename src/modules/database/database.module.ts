import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoadStrategy } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { databaseSchema } from '../configuration/schemas/database.schema';
import { buildDatabaseConfig } from './mikro-orm.config';

@Module({})
export class DatabaseModule {
    static register(): DynamicModule {
        return {
            module: DatabaseModule,
            imports: [
                MikroOrmModule.forRootAsync({
                    imports: [ConfigModule],
                    inject: [ConfigService<typeof databaseSchema>],
                    useFactory: (configService: ConfigService<typeof databaseSchema>) => {
                        return {
                            ...buildDatabaseConfig(
                                configService.get<boolean>('DATABASE_DEBUG_LOGGING'),
                                configService.get<string>('DATABASE_HOST'),
                                configService.get<number>('DATABASE_PORT'),
                                configService.get<string>('DATABASE_USERNAME'),
                                configService.get<string>('DATABASE_PASSWORD'),
                                configService.get<string>('DATABASE_SCHEMA'),
                                configService.get<boolean>('DATABASE_SSL'),
                                configService.get<number>('DATABASE_POOLSIZE'),
                                configService.get<number>('DATABASE_IDLE_TIMEOUT'),
                            ),
                            autoLoadEntities: true,
                            loadStrategy: LoadStrategy.SELECT_IN,
                        };
                    },
                })
            ],
            exports: [],
        };
    }
}

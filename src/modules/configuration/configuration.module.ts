import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { configurationSchema } from './schemas/configuration.schema';

@Module({
    imports: [
        NestConfigModule.forRoot({
            envFilePath: process.env.ENV_FILE_PATH,
            validationSchema: configurationSchema,
            isGlobal: true,
            cache: true,
        }),
    ],
    providers: [],
    exports: [],
})
export class ConfigurationModule {}

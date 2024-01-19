import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ApiHealthController } from './api-health.controller';

@Module({
    imports: [
        TerminusModule.forRoot({
            errorLogStyle: 'pretty',
        }),
    ],
    controllers: [ApiHealthController],
})
export class ApiHealthModule {}

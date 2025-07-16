import { Module } from '@nestjs/common';
import { TriggerHandlersService } from './trigger-handlers.service';

@Module({
    providers: [TriggerHandlersService],
    exports: [TriggerHandlersService],
})
export class TriggerHandlersModule {}

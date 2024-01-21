import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';

@Module({
    imports: [],
    providers: [SlackService],
    controllers: [],
    exports: [SlackService],
})
export class IntegrationsModule {}

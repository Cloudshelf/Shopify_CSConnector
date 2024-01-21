import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MiscellaneousUtils } from '../../utils/MiscellaneousUtils';
import { slackSchema } from '../configuration/schemas/slack.schema';
import { MessageAttachment, WebClient } from '@slack/web-api';

@Injectable()
export class SlackService {
    private readonly slackClient: WebClient;
    private readonly logger = new Logger('SlackService');

    constructor(private readonly configService: ConfigService<typeof slackSchema>) {
        this.slackClient = new WebClient(configService.get<string>('SLACK_TOKEN')!);
    }

    async sendGeneralNotification(attachments: MessageAttachment[]): Promise<void> {
        return this.sendNotification(
            this.configService.get<string>('SLACK_GENERAL_NOTIFICATION_CHANNEL')!,
            attachments,
        );
    }

    async sendHealthNotification(attachments: MessageAttachment[]): Promise<void> {
        return this.sendNotification(this.configService.get<string>('SLACK_HEALTH_NOTIFICATION_CHANNEL')!, attachments);
    }

    async sendNotification(channel: string, attachments: MessageAttachment[]): Promise<void> {
        let prepend = '';
        if (!MiscellaneousUtils.isProduction()) {
            prepend = '[DEVELOPMENT] ';
        }

        await this.slackClient.chat.postMessage({
            channel,
            text: ' ',
            username: prepend + 'Shopify Connector - Cloudshelf Notifier',
            attachments,
        });
    }
}

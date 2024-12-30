import { MiscellaneousUtils } from './MiscellaneousUtils';
import { MessageAttachment, WebClient } from '@slack/web-api';

export class SlackUtils {
    static async SendNotification(slackToken: string, channel: string, attachments: MessageAttachment[]) {
        const slackClient = new WebClient(slackToken);

        let prepend = '';
        if (!MiscellaneousUtils.isProduction()) {
            prepend = '[DEVELOPMENT] ';
        }

        await slackClient.chat.postMessage({
            channel,
            text: ' ',
            username: prepend + 'Shopify Connector - Cloudshelf Notifier',
            attachments,
        });
    }
}

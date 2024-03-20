import { MessageAttachment } from '@slack/web-api';

export class NotificationUtils {
    static buildSyncIssueNotifications(retailerData: { displayName: string; url: string }[]): MessageAttachment[] {
        let markdownContent = '';

        retailerData.forEach(retailer => {
            markdownContent += `• ${retailer.displayName} - ${retailer.url}\n`;
        });

        const attachments: MessageAttachment[] = [
            {
                color: 'FFB700',
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: 'Possible sync issues detected',
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Retailers:* 
${markdownContent}
`,
                        },
                    },
                ],
            },
        ];

        return attachments;
    }

    static buildInstallAttachments(retailerName: string, domain: string, email: string): MessageAttachment[] {
        const attachments: MessageAttachment[] = [
            {
                color: '00FF00',
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: 'Retailer Installed Cloudshelf',
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Retailer:* 
${retailerName}

*Email:* 
${email}
`,
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Domain:*
${domain}`,
                        },
                    },
                ],
            },
        ];

        return attachments;
    }

    static buildUninstallAttachments(domain: string, type: 'uninstall' | 'redact'): MessageAttachment[] {
        let colour = '#000000';
        if (type === 'uninstall') {
            colour = '#880808';
        } else if (type === 'redact') {
            colour = '#FFB700';
        }

        let headerText = '';
        if (type === 'uninstall') {
            headerText = 'Retailer Uninstalled Cloudshelf';
        } else if (type === 'redact') {
            headerText = 'Store Redact Requested';
        }

        let markdown = ``;

        if (type === 'uninstall') {
            markdown = `*Domain:* 
${domain}
                  
*Note:* 
The store has been removed from the Cloudshelf Connector. Store data will not be removed from Cloudshelf until Shopify requests us to do so; this allows retailers to reinstall without losing their data.`;
        } else if (type === 'redact') {
            markdown = `*Domain:* 
${domain}
                  
*Note:*
Store data will shortly be removed from Cloudshelf.`;
        }

        const attachments: MessageAttachment[] = [
            {
                color: colour,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: headerText,
                        },
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: markdown,
                        },
                    },
                ],
            },
        ];

        return attachments;
    }
}

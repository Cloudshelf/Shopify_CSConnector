import { MessageAttachment } from '@slack/web-api';

export class NotificationUtils {
    static buildDeleteTestNotifications(retailerData: {
        displayName: string;
        ourCount: number;
        shopifyCount: number;
    }): MessageAttachment[] {
        const markdownContent = `• ${retailerData.displayName}\n  Our Count: ${
            retailerData.ourCount
        }\n  Shopify Count: ${retailerData.shopifyCount}\n  Difference: ${
            retailerData.ourCount - retailerData.shopifyCount
        }`;

        const attachments: MessageAttachment[] = [
            {
                color: retailerData.ourCount !== retailerData.shopifyCount ? '#FF0000' : '#00FF00',
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: 'Product Group Deletion Test',
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

    static buildInstallAttachments(
        retailerName: string,
        domain: string,
        email: string,
        cur: string | null,
    ): MessageAttachment[] {
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
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*Currency:*
${cur ? cur : 'Unknown'}`,
                        },
                    },
                ],
            },
        ];

        return attachments;
    }

    static buildOrderNotice(domain: string, webhookid: string, payload: string, type: string): MessageAttachment[] {
        const attachments: MessageAttachment[] = [
            {
                color: '#000000',
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `order webhook debug: ${type}`,
                        },
                    },
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `Domain: ${domain}`,
                        },
                    },
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `Webhook ID: ${webhookid}`,
                        },
                    },
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `Payload: ${payload}`,
                        },
                    },
                ],
            },
        ];

        return attachments;
    }

    static buildUninstallAttachments(
        domain: string,
        type: 'uninstall' | 'redact',
        installedDate?: Date,
    ): MessageAttachment[] {
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
${domain}`;
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
                    ...(installedDate
                        ? [
                              {
                                  type: 'section',
                                  // @ts-ignore
                                  text: {
                                      type: 'mrkdwn',
                                      text: `*Installed Date:*\n${installedDate.toLocaleDateString('en-GB')}`,
                                  },
                              },
                          ]
                        : []),
                ],
            },
        ];

        return attachments;
    }
}

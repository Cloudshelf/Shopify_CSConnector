import { Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { SentryUtil } from '../../../utils/SentryUtil';
import { SlackService } from '../../integrations/slack.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifyHmac, ShopifyHmacType } from '@nestjs-shopify/core';

@Controller('/shopify/required_webhooks')
export class RequiredWebhooksController {
    private readonly logger = new ExtendedLogger('RequiredWebhooksController');
    constructor(private readonly slackService: SlackService) {}

    @Post('/shop_redact')
    @HttpCode(200)
    @ShopifyHmac(ShopifyHmacType.Header)
    async shopRedact(@Headers('X-Shopify-Shop-Domain') shopDomain: string) {
        this.logger.log('Received shop redact webhook for domain ' + shopDomain);

        SentryUtil.InformationalTransaction('Webhook:Received', 'SHOP_REDACT', {
            id: shopDomain,
            username: shopDomain,
        });

        await this.slackService.sendGeneralNotification(
            NotificationUtils.buildUninstallAttachments(shopDomain, 'redact'),
        );
    }

    @Post('/customer_redact')
    @HttpCode(200)
    @ShopifyHmac(ShopifyHmacType.Header)
    async customerRedact(@Headers('X-Shopify-Shop-Domain') shopDomain: string) {
        this.logger.log('Received customer redact webhook for domain ' + shopDomain);

        SentryUtil.InformationalTransaction('Webhook:Received', 'CUSTOMER_REDACT', {
            id: shopDomain,
            username: shopDomain,
        });
    }

    @Post('/customer_data_request')
    @HttpCode(200)
    @ShopifyHmac(ShopifyHmacType.Header)
    async customerDataRequest(@Headers('X-Shopify-Shop-Domain') shopDomain: string) {
        this.logger.log(`Received customer data request webhook for domain ${shopDomain}`);

        SentryUtil.InformationalTransaction('Webhook:Received', 'CUSTOMER_DATA_REQUEST', {
            id: shopDomain,
            username: shopDomain,
        });
    }
}

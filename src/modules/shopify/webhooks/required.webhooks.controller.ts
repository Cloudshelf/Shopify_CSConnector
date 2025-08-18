import { Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { ShopifyHmac, ShopifyHmacType } from '@nestjs-shopify/core';
import { Telemetry } from 'src/decorators/telemetry';
import { TelemetryUtil } from '../../../utils/TelemetryUtil';

@Controller('/shopify/required_webhooks')
export class RequiredWebhooksController {
    private readonly logger = new ExtendedLogger('RequiredWebhooksController');

    @Telemetry('webhook.shopRedact')
    @Post('/shop_redact')
    @HttpCode(200)
    @ShopifyHmac(ShopifyHmacType.Header)
    async shopRedact(@Headers('X-Shopify-Shop-Domain') shopDomain: string) {
        this.logger.log('Received shop redact webhook for domain ' + shopDomain);

        TelemetryUtil.InformationalTransaction('Webhook:Received', 'SHOP_REDACT', {
            shopDomain,
        }, {
            id: shopDomain,
            username: shopDomain,
        });

        // await this.slackService.sendGeneralNotification(
        //     NotificationUtils.buildUninstallAttachments(shopDomain, 'redact'),
        // );
    }

    @Telemetry('webhook.customerRedact')
    @Post('/customer_redact')
    @HttpCode(200)
    @ShopifyHmac(ShopifyHmacType.Header)
    async customerRedact(@Headers('X-Shopify-Shop-Domain') shopDomain: string) {
        this.logger.log('Received customer redact webhook for domain ' + shopDomain);

        TelemetryUtil.InformationalTransaction('Webhook:Received', 'CUSTOMER_REDACT', {
            shopDomain,
        }, {
            id: shopDomain,
            username: shopDomain,
        });
    }

    @Telemetry('webhook.customerDataRequest')
    @Post('/customer_data_request')
    @HttpCode(200)
    @ShopifyHmac(ShopifyHmacType.Header)
    async customerDataRequest(@Headers('X-Shopify-Shop-Domain') shopDomain: string) {
        this.logger.log(`Received customer data request webhook for domain ${shopDomain}`);

        TelemetryUtil.InformationalTransaction('Webhook:Received', 'CUSTOMER_DATA_REQUEST', {
            shopDomain,
        }, {
            id: shopDomain,
            username: shopDomain,
        });
    }
}

import { Injectable } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { SlackService } from '../../integrations/slack.service';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifySessionEntity } from '../sessions/shopify.session.entity';
import { ShopifyRestResources } from '../shopify.module';
import { ShopifyAuthAfterHandler } from '@nestjs-shopify/auth';
import { InjectShopify } from '@nestjs-shopify/core';
import { ShopifyWebhooksService } from '@nestjs-shopify/webhooks';
import { Shopify } from '@shopify/shopify-api';
import { Request, Response } from 'express';

@Injectable()
export class AfterAuthHandlerService implements ShopifyAuthAfterHandler {
    private readonly logger = new ExtendedLogger('AfterAuthHandlerService');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly webhookService: ShopifyWebhooksService,
        private readonly slackService: SlackService,
        @InjectShopify() private readonly shopifyApiService: Shopify,
    ) {}

    @SentryInstrument('AfterAuthHandlerService')
    async afterAuth(req: Request, res: Response, session: ShopifySessionEntity): Promise<void> {
        const { host } = req.query;

        if (session.isOnline) {
            //we don't handle online sessions
            //     if (!(await this.shopsService.exists(shop))) {
            //         return res.redirect(`/api/offline/auth?shop=${shop}`);
            //     }
            //
            //     return res.redirect(`/?shop=${shop}&host=${host}`);

            //Send a bad request response (temp)
            res.status(400).end();
            return;
        }

        if (!session.accessToken) {
            this.logger.error('No access token found in session');
            //Send a bad request response (temp)
            res.status(400).end();
            return;
        }

        if (!session.scope) {
            this.logger.error('No scope found in session');
            //Send a bad request response (temp)
            res.status(400).end();
            return;
        }

        const { entity, status } = await this.retailerService.updateOrCreate(
            session.shop,
            session.accessToken,
            session.scope,
        );

        //if it's a new store, or the scopes have changed, we need to re-register the webhooks
        if (status !== 'noChange') {
            this.logger.log(`Registering webhooks for shop ${session.shop}`);
            await this.webhookService.registerWebhooks(session);
        }

        //if it's a new store, we need to do some extra work like inform the Cloudshelf API and send a Slack notification
        if (status === 'created') {
            let storeName = 'Unknown';
            let email = 'Unknown';
            let currency = 'Unknown';

            try {
                const shopData = await (this.shopifyApiService.rest as ShopifyRestResources).Shop.all({
                    session: session,
                });

                if (shopData.data.length >= 1) {
                    storeName = shopData.data[0].name ?? 'Unknown';
                    email = shopData.data[0].email ?? 'Unknown';
                    currency = shopData.data[0].currency ?? 'Unknown';
                }
            } catch (e) {
                this.logger.error(e);
            }

            await this.slackService.sendGeneralNotification(
                NotificationUtils.buildInstallAttachments(storeName, session.shop, email),
            );
        }

        res.send('Shop installed: ' + session.shop).end();
    }
}

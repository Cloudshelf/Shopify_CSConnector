import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { SlackService } from '../../integrations/slack.service';
import { RetailerService } from '../../retailer/retailer.service';
import { CustomTokenService } from '../sessions/custom.token.service';
import { DatabaseSessionStorage } from '../sessions/database.session.storage';
import { ShopifySessionEntity } from '../sessions/shopify.session.entity';
import { ShopifyRestResources } from '../shopify.module';
import { StorefrontService } from '../storefront/storefront.service';
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
        private readonly storefrontService: StorefrontService,
        private readonly customTokenService: CustomTokenService,
    ) {}

    @SentryInstrument('AfterAuthHandlerService')
    async afterAuth(req: Request, res: Response, session: ShopifySessionEntity): Promise<void> {
        const { host } = req.query;

        if (session.isOnline) {
            //here we should check the store exists in our database, and if not, redirect to the offline auth page
            if (!(await this.retailerService.existsByDomain(session.shop))) {
                return res.redirect(`/shopify/offline/auth?shop=${session.shop}`);
            }

            //todo, generate a cloudshelf auth token for the store

            await this.customTokenService.storeToken(session.shop, 'test token');

            // after we have a cloudshelf auth token, we can redirect to the cloudshelf app,
            // which is proxied via the connector, so we just need to redirect to the route and include the shop domain
            return res.redirect(`/?shop=${session.shop}`);
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
            //Try to get some additional information about the store
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

                entity.displayName = storeName;
                entity.email = email;
                entity.currencyCode = currency;
            } catch (e) {
                this.logger.error(e);
            }

            //create a storefront token if needed
            const storefrontToken = await this.storefrontService.generateStorefrontTokenIfRequired(session);
            entity.storefrontToken = storefrontToken;

            await this.retailerService.save(entity);

            //Send the installation notification to the Cloudshelf Slack
            await this.slackService.sendGeneralNotification(
                NotificationUtils.buildInstallAttachments(storeName, session.shop, email),
            );
        }

        //at the end of the install, we have to redirect to "online auth", which lets us exchange an online session token for a Cloudshelf Auth Token
        return res.redirect(`/shopify/online/auth?shop=${session.shop}`);
    }
}

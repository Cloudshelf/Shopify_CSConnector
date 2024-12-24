import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { NotificationUtils } from '../../../utils/NotificationUtils';
import { RequestUtils } from '../../../utils/RequestUtils';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { shopifySchema } from '../../configuration/schemas/shopify.schema';
import { LocationJobUtils } from '../../data-ingestion/location.job.utils';
import { ProductJobUtils } from '../../data-ingestion/product.job.utils';
import { SlackService } from '../../integrations/slack.service';
import { RetailerService } from '../../retailer/retailer.service';
import { CustomTokenService } from '../sessions/custom.token.service';
import { ShopifySessionEntity } from '../sessions/shopify.session.entity';
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
        private readonly storefrontService: StorefrontService,
        private readonly customTokenService: CustomTokenService,
        private readonly configService: ConfigService<typeof shopifySchema>,
        private readonly cloudshelfApiService: CloudshelfApiService,
        @InjectShopify() private readonly shopifyApiService: Shopify,
    ) {}

    @SentryInstrument('AfterAuthHandlerService')
    async afterAuth(req: Request, res: Response, session: ShopifySessionEntity): Promise<void> {
        const { host } = req.query;

        if (session.isOnline) {
            //here we should check the store exists in our database, and if not, redirect to the offline auth page
            if (!(await this.retailerService.existsByDomain(session.shop))) {
                return res.redirect(`/shopify/offline/auth?shop=${session.shop}`);
            }

            const token = await this.cloudshelfApiService.getCloudshelfAuthToken(session.shop);
            if (!token) {
                //failed to get token, we redirect to the offline auth page
                return res.redirect(`/shopify/offline/auth?shop=${session.shop}`);
            }

            await this.customTokenService.storeToken(session.shop, token);

            //now redirect to the shopify admin panel with our app selected
            const shopifyAdminAppUrl = `https://admin.shopify.com/store/${RequestUtils.getShopIdFromRequest(
                req,
            )}/apps/${this.configService.get<string>('SHOPIFY_API_KEY')!}?host=${host}&shop=${session.shop}`;
            return res.redirect(shopifyAdminAppUrl);
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

        // eslint-disable-next-line prefer-const
        let { entity, status } = await this.retailerService.updateOrCreate(
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
            //create a storefront token if needed
            const storefrontToken = await this.storefrontService.generateStorefrontTokenIfRequired(session);
            entity.storefrontToken = storefrontToken;

            //Try to get some additional information about the store
            entity = await this.retailerService.updateShopInformationFromShopifyOnlineSession(
                this.shopifyApiService,
                entity,
                session,
            );

            //get theme info from Shopify
            entity = await this.retailerService.updateLogoFromShopify(entity);

            await this.retailerService.save(entity);

            //Send the installation notification to the Cloudshelf Slack
            await this.slackService.sendGeneralNotification(
                NotificationUtils.buildInstallAttachments(entity.displayName!, session.shop, entity.email!),
            );
        }

        //report store to Cloudshelf API
        await this.cloudshelfApiService.upsertStore(entity);
        //create theme on Cloudshelf API
        await this.cloudshelfApiService.createTheme(entity);

        //queue a sync job

        await ProductJobUtils.scheduleTriggerJob(entity, true, undefined, 'install');
        //queue a location job
        await LocationJobUtils.schedule(entity, 'install');

        //at the end of the install, we have to redirect to "online auth", which lets us exchange an online session token for a Cloudshelf Auth Token
        return res.redirect(`/shopify/online/auth?shop=${session.shop}`);
    }
}

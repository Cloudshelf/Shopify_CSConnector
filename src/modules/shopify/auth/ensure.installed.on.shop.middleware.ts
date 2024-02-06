import { Injectable, NestMiddleware } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { HtmlUtils } from '../../../utils/HtmlUtils';
import { RequestUtils } from '../../../utils/RequestUtils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { CustomTokenService } from '../sessions/custom.token.service';
import { DatabaseSessionStorage } from '../sessions/database.session.storage';
import { InjectShopify } from '@nestjs-shopify/core';
import { Shopify } from '@shopify/shopify-api';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class EnsureInstalledOnShopMiddleware implements NestMiddleware {
    readonly logger = new ExtendedLogger('EnsureInstalledOnShopMiddleware');
    constructor(
        @InjectShopify() private readonly shopifyApiService: Shopify,
        private readonly databaseSessionStorage: DatabaseSessionStorage,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly customTokenService: CustomTokenService,
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        this.logger.debug(`In EnsureInstalledOnShopMiddleware`);

        //log the path the middleware is being called from
        this.logger.debug(`Path: ${req.path}`);

        if (!this.shopifyApiService.config.isEmbeddedApp) {
            this.logger.warn('EnsureInstalledOnShopMiddleware should only be used for embedded apps');
            return;
        }

        const shop = req.query['shop'] as string;

        if (!shop) {
            this.logger.debug(`No shop found in query params, skipping`);
            next();
            return;
        }

        const shopifySession = req.query['session'];
        const queryHasSession = shopifySession !== undefined;

        this.logger.debug(`Checking if shop has installed the app: ${shop}, shopifySession: ${shopifySession}`);

        const offlineSessionId = this.shopifyApiService.session.getOfflineId(shop);
        const offlineSession = await this.databaseSessionStorage.loadSession(offlineSessionId);
        if (!offlineSession) {
            this.logger.log(
                `Session not found for shop ${shop}, redirecting to auth, query params: ${JSON.stringify(req.query)}`,
            );

            if (queryHasSession) {
                return res.end(HtmlUtils.generateExitToInstallPage(shop));
            } else {
                return res.redirect(HtmlUtils.generateInstallRedirectUrl(shop));
            }
            // return res.redirect(`/shopify/offline/auth?shop=${shop}`);
        } else {
            const token = await this.cloudshelfApiService.getCloudshelfAuthToken(shop);
            if (!token) {
                if (queryHasSession) {
                    return res.end(HtmlUtils.generateExitToInstallPage(shop));
                } else {
                    return res.redirect(HtmlUtils.generateInstallRedirectUrl(shop));
                }

                //failed to get token, we redirect to the offline auth page
                // return res.redirect(HtmlUtils.generateInstallRedirectUrl(shop));

                // return res.redirect(`/shopify/offline/auth?shop=${shop}`);
            }
            await this.customTokenService.storeToken(shop, token);
        }

        this.logger.debug(`Session found for shop ${shop}, continuing`);
        next();
    }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectShopify } from '@nestjs-shopify/core';
import { Shopify } from '@shopify/shopify-api';
import { NextFunction, Request, Response } from 'express';
import { Telemetry } from 'src/decorators/telemetry';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { HtmlUtils } from '../../../utils/HtmlUtils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { CustomTokenService } from '../sessions/custom.token.service';
import { DatabaseSessionStorage } from '../sessions/database.session.storage';

@Injectable()
export class EnsureInstalledOnShopMiddleware implements NestMiddleware {
    readonly logger = new ExtendedLogger('EnsureInstalledOnShopMiddleware');
    constructor(
        @InjectShopify() private readonly shopifyApiService: Shopify,
        private readonly databaseSessionStorage: DatabaseSessionStorage,
        private readonly cloudshelfApiService: CloudshelfApiService,
        private readonly customTokenService: CustomTokenService,
    ) {}

    @Telemetry('middleware.ensure-installed-on-shop.use')
    async use(req: Request, res: Response, next: NextFunction) {
        this.logger.debug(`In EnsureInstalledOnShopMiddleware`);

        //log the path the middleware is being called from
        this.logger.debug(`Path: ${req.path}`);

        if (!this.shopifyApiService.config.isEmbeddedApp) {
            this.logger.warn('EnsureInstalledOnShopMiddleware should only be used for embedded apps');
            return;
        }

        const shopParam = req.query['shop'] as string;

        if (!shopParam) {
            this.logger.debug(`No shop found in query params, skipping`);
            next();
            return;
        }
        // Validate shop domain to prevent open redirect vulnerability
        // Using Shopify SDK's built-in sanitizeShop utility
        let shop: string | null;
        try {
            shop = this.shopifyApiService.utils.sanitizeShop(shopParam, true);
        } catch (error) {
            // Log the validation error but don't send response here
            this.logger.warn(`Shop validation failed for: ${shopParam}`, error);
            shop = null;
        }

        if (!shop) {
            this.logger.warn(`Invalid shop domain attempted: ${shopParam}`);
            res.status(400).send('Invalid shop domain');
            return;
        }

        this.logger.debug(`Shop domain validated: ${shop}`);

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

            const hasAllRequiredScopes = this.shopifyApiService.config.scopes?.equals(offlineSession.scope);

            if (!hasAllRequiredScopes) {
                if (queryHasSession) {
                    return res.end(HtmlUtils.generateExitToInstallPage(shop));
                } else {
                    return res.redirect(HtmlUtils.generateInstallRedirectUrl(shop));
                }
            }

            await this.customTokenService.storeToken(shop, token);
        }

        this.logger.debug(`Session found for shop ${shop}, continuing`);
        next();
    }
}

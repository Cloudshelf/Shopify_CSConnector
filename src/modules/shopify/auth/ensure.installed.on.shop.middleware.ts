import { Injectable, NestMiddleware } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
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
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        this.logger.debug(`In EnsureInstalledOnShopMiddleware`);

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

        this.logger.debug(`Checking if shop has installed the app: ${shop}`);

        const offlineSessionId = this.shopifyApiService.session.getOfflineId(shop);
        const offlineSession = await this.databaseSessionStorage.loadSession(offlineSessionId);
        if (!offlineSession) {
            this.logger.log(`Session not found for shop ${shop}, redirecting to auth`);
            // return res.redirect(`/shopify/offline/auth?shop=${shop}`);

            res.status(403);
            res.append('Access-Control-Expose-Headers', [
                'X-Shopify-Api-Request-Failure-Reauthorize',
                'X-Shopify-Api-Request-Failure-Reauthorize-Url',
            ]);
            res.header('X-Shopify-API-Request-Failure-Reauthorize', '1');
            res.header(
                'X-Shopify-API-Request-Failure-Reauthorize-Url',
                `https://development.shopifyconnector.cloudshelf.ai/shopify/offline/auth?shop=${shop}`,
            );
            res.end();
        }

        this.logger.debug(`Session found for shop ${shop}, continuing`);
    }
}

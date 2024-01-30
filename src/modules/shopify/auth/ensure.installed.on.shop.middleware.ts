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
        const shop = req.query['shop'] as string;

        if (!shop) {
            this.logger.debug(`No shop found in query params, skipping`);
            next();
            return;
        }

        this.logger.debug(`Running EnsureInstalledOnShopMiddleware for shop ${shop}`);

        const offlineSessionId = this.shopifyApiService.session.getOfflineId(shop);
        this.logger.debug(`OfflineSessionId: ${offlineSessionId}`);
        const offlineSession = await this.databaseSessionStorage.loadSession(offlineSessionId);
        this.logger.debug(`offlineSession: ${JSON.stringify(offlineSession)}`);

        if (!offlineSession) {
            this.logger.log(`Session not found for shop ${shop}, redirecting to auth`);
            return res.redirect(`/shopify/offline/auth?shop=${shop}`);
        }

        this.logger.debug(`Session found for shop ${shop}, continuing`);
    }
}

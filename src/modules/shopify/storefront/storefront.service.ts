import { Injectable } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { ShopifySessionEntity } from '../sessions/shopify.session.entity';
import { ShopifyRestResources } from '../shopify.module';
import { InjectShopify } from '@nestjs-shopify/core';
import { Shopify } from '@shopify/shopify-api';

@Injectable()
export class StorefrontService {
    private static readonly TOKEN_TITLE = 'Cloudshelf';
    private readonly logger = new ExtendedLogger('StorefrontService');

    constructor(@InjectShopify() private readonly shopifyApiService: Shopify) {}

    @SentryInstrument('StorefrontService')
    async generateStorefrontTokenIfRequired(session: ShopifySessionEntity): Promise<string | null> {
        try {
            const allTokens = await (this.shopifyApiService.rest as ShopifyRestResources).StorefrontAccessToken.all({
                session,
            });

            const foundToken = allTokens.data.find(({ title }) => title === StorefrontService.TOKEN_TITLE);
            if (foundToken) {
                return foundToken.access_token;
            }
        } catch (err) {
            this.logger.warn(`The storefront token for ${session.shop} could not be retrieved: ${JSON.stringify(err)}`);
        }
        this.logger.log(`No token found for ${session.shop}, will create...`);
        return this.createStorefrontToken(session);
    }

    @SentryInstrument('StorefrontService')
    private async createStorefrontToken(session: ShopifySessionEntity): Promise<string | null> {
        try {
            const storefront_access_token = new (
                this.shopifyApiService.rest as ShopifyRestResources
            ).StorefrontAccessToken({
                session,
            });
            storefront_access_token.title = StorefrontService.TOKEN_TITLE;
            await storefront_access_token.save({
                update: true,
            });
            return storefront_access_token.accessToken;
        } catch (err) {
            this.logger.warn(`The storefront token for ${session.shop} could not be created: ${JSON.stringify(err)}`);
        }

        return null;
    }
}

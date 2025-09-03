import { Injectable } from '@nestjs/common';
import { InjectShopify } from '@nestjs-shopify/core';
import { Shopify } from '@shopify/shopify-api';
import { Telemetry } from 'src/decorators/telemetry';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { ShopifySessionEntity } from '../sessions/shopify.session.entity';
import { ShopifyRestResources } from '../shopify.module';

@Injectable()
export class StorefrontService {
    private static readonly TOKEN_TITLE = 'Cloudshelf';
    private readonly logger = new ExtendedLogger('StorefrontService');

    constructor(@InjectShopify() private readonly shopifyApiService: Shopify) {}

    @Telemetry('service.storefront.generateStorefrontTokenIfRequired')
    async generateStorefrontTokenIfRequired(session: ShopifySessionEntity): Promise<string | null> {
        try {
            const allTokens = await (this.shopifyApiService.rest as ShopifyRestResources).StorefrontAccessToken.all({
                session,
            });

            const foundToken = allTokens.data.find(
                ({ title }: { title: string | null }) => title === StorefrontService.TOKEN_TITLE,
            );
            if (foundToken) {
                return foundToken.access_token;
            }
        } catch (err) {
            this.logger.warn(`The storefront token for ${session.shop} could not be retrieved: ${JSON.stringify(err)}`);
        }
        this.logger.log(`No token found for ${session.shop}, will create...`);
        return this.createStorefrontToken(session);
    }

    @Telemetry('service.storefront.createStorefrontToken')
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
            return storefront_access_token.access_token;
        } catch (err) {
            this.logger.warn(`The storefront token for ${session.shop} could not be created: ${JSON.stringify(err)}`);
        }

        return null;
    }
}

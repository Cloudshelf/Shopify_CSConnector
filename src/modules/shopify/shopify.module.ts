import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { runtimeSchema } from '../configuration/schemas/runtime.schema';
import { shopifySchema } from '../configuration/schemas/shopify.schema';
import { RetailerModule } from '../retailer/retailer.module';
import { RetailerService } from '../retailer/retailer.service';
import { AfterAuthHandlerService } from './auth/after.auth.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseSessionStorage } from './sessions/database.session.storage';
import { SessionModule } from './sessions/session.module';
import { BulkOperationFinishedWebhookHandler } from './webhooks/bulk.operation.finish.webhook.handler';
import { CollectionDeleteWebhookHandler } from './webhooks/collection.delete.webhook.handler';
import { CollectionUpdateWebhookHandler } from './webhooks/collection.update.webhook.handler';
import { ProductsDeleteWebhookHandler } from './webhooks/product.delete.webhook.handler';
import { ProductsUpdateWebhookHandler } from './webhooks/product.update.webhook.handler';
import { RequiredWebhooksController } from './webhooks/required.webhooks.controller';
import { SubscriptionUpdateWebhookHandler } from './webhooks/subscription.update.webhook.handler';
import { UninstalledWebhookHandler } from './webhooks/uninstall.webhook.handler';
import { ShopifyAuthModule } from '@nestjs-shopify/auth';
import { ShopifyCoreModule } from '@nestjs-shopify/core';
import { ShopifyWebhooksModule } from '@nestjs-shopify/webhooks';
import { ApiVersion } from '@shopify/shopify-api';

@Module({})
export class ShopifyModule {
    static register(): DynamicModule {
        const nestjsShopifyCore = ShopifyCoreModule.forRootAsync({
            imports: [ConfigModule, SessionModule, RetailerModule],
            inject: [
                ConfigService<typeof shopifySchema>,
                ConfigService<typeof runtimeSchema>,
                DatabaseSessionStorage,
                RetailerService,
            ],
            useFactory: async (
                shopifyConfigService: ConfigService<typeof shopifySchema>,
                runtimeConfigService: ConfigService<typeof runtimeSchema>,
                sessionStorage: DatabaseSessionStorage,
                retailerService: RetailerService,
            ) => {
                return {
                    getSharedSecret: retailerService.getSharedSecret,
                    sessionStorage: sessionStorage,
                    apiKey: shopifyConfigService.get<string>('SHOPIFY_API_KEY')!,
                    apiSecretKey: shopifyConfigService.get<string>('SHOPIFY_API_SECRET_KEY')!,
                    apiVersion: ApiVersion.January24,
                    hostName: runtimeConfigService.get('HOST')!.replace(/https:\/\//, ''),
                    isEmbeddedApp: true,
                    scopes: [
                        'unauthenticated_read_product_listings',
                        'unauthenticated_read_product_tags',
                        'unauthenticated_read_product_inventory',
                        'unauthenticated_read_product_pickup_locations',
                        'read_orders',
                        'unauthenticated_read_checkouts',
                        'unauthenticated_write_checkouts',
                        //Authenticated Scopes
                        'read_inventory',
                        'read_locations',
                        'read_products',
                        'read_themes',
                        'read_product_listings',
                        'read_discounts',
                        'read_marketing_events',
                        'read_fulfillments',
                        'read_legal_policies',
                        'read_locales',
                        'read_merchant_managed_fulfillment_orders',
                        'read_price_rules',
                        'write_discounts',
                    ],
                };
            },
        });

        const offlineAuth = ShopifyAuthModule.forRootAsyncOffline({
            imports: [AuthModule],
            inject: [AfterAuthHandlerService],
            useFactory: async (afterAuthService: AfterAuthHandlerService) => {
                return {
                    useGlobalPrefix: false,
                    basePath: '/offline',
                    afterAuthHandler: afterAuthService,
                    returnHeaders: true,
                };
            },
        });

        const webhooks = ShopifyWebhooksModule.forRootAsync({
            imports: [],
            inject: [],
            useFactory: async () => {
                return {
                    path: '/shopify/webhooks',
                };
            },
        });

        return {
            module: ShopifyModule,
            imports: [nestjsShopifyCore, offlineAuth, webhooks],
            providers: [
                BulkOperationFinishedWebhookHandler,
                UninstalledWebhookHandler,
                ProductsUpdateWebhookHandler,
                ProductsDeleteWebhookHandler,
                CollectionUpdateWebhookHandler,
                CollectionDeleteWebhookHandler,
                SubscriptionUpdateWebhookHandler,
            ],
            exports: [nestjsShopifyCore, offlineAuth, webhooks],
            controllers: [RequiredWebhooksController],
        };
    }
}
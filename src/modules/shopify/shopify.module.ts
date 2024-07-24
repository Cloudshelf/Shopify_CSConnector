import { DynamicModule, Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudshelfModule } from '../cloudshelf/cloudshelf.module';
import { runtimeSchema } from '../configuration/schemas/runtime.schema';
import { shopifySchema } from '../configuration/schemas/shopify.schema';
import { DataIngestionModule } from '../data-ingestion/data.ingestion.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { RetailerModule } from '../retailer/retailer.module';
import { RetailerService } from '../retailer/retailer.service';
import { AfterAuthHandlerService } from './auth/after.auth.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseSessionStorage } from './sessions/database.session.storage';
import { SessionModule } from './sessions/session.module';
import { StorefrontService } from './storefront/storefront.service';
import { BulkOperationFinishedWebhookHandler } from './webhooks/bulk.operation.finish.webhook.handler';
import { CollectionDeleteWebhookHandler } from './webhooks/collection.delete.webhook.handler';
import { OrdersUpdatedWebhookHandler } from './webhooks/order.update.webhook.handler';
import { ProductsDeleteWebhookHandler } from './webhooks/product.delete.webhook.handler';
import { RequiredWebhooksController } from './webhooks/required.webhooks.controller';
import { SubscriptionUpdateWebhookHandler } from './webhooks/subscription.update.webhook.handler';
import { UninstalledWebhookHandler } from './webhooks/uninstall.webhook.handler';
import { ShopifyAuthModule } from '@nestjs-shopify/auth';
import { ShopifyCoreModule } from '@nestjs-shopify/core';
import { ShopifyWebhooksModule } from '@nestjs-shopify/webhooks';
import { ApiVersion, LogSeverity } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2024-01';

export type ShopifyRestResources = typeof restResources;
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
                    logger: {
                        level: LogSeverity.Debug,
                    },
                    getSharedSecret: retailerService.getSharedSecret,
                    sessionStorage: sessionStorage,
                    apiKey: shopifyConfigService.get<string>('SHOPIFY_API_KEY')!,
                    apiSecretKey: shopifyConfigService.get<string>('SHOPIFY_API_SECRET_KEY')!,
                    apiVersion: ApiVersion.January24,
                    hostName: runtimeConfigService.get('HOST')!.replace(/https:\/\//, ''),
                    isEmbeddedApp: true,
                    restResources,
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
                        'write_draft_orders',
                        'write_assigned_fulfillment_orders',
                        'write_merchant_managed_fulfillment_orders',
                        'write_third_party_fulfillment_orders',
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
                    basePath: '/shopify/offline',
                    afterAuthHandler: afterAuthService,
                    returnHeaders: true,
                };
            },
        });

        const onlineAuth = ShopifyAuthModule.forRootAsyncOnline({
            imports: [AuthModule],
            inject: [AfterAuthHandlerService],
            useFactory: async (afterAuthService: AfterAuthHandlerService) => {
                return {
                    useGlobalPrefix: false,
                    basePath: '/shopify/online',
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
            imports: [
                CloudshelfModule,
                RetailerModule,
                IntegrationsModule,
                nestjsShopifyCore,
                offlineAuth,
                onlineAuth,
                webhooks,
                DataIngestionModule,
            ],
            providers: [
                BulkOperationFinishedWebhookHandler,
                UninstalledWebhookHandler,
                ProductsDeleteWebhookHandler,
                CollectionDeleteWebhookHandler,
                SubscriptionUpdateWebhookHandler,
                OrdersUpdatedWebhookHandler,
                DatabaseSessionStorage,
                StorefrontService,
            ],
            exports: [nestjsShopifyCore, offlineAuth, onlineAuth, webhooks, DatabaseSessionStorage, StorefrontService],
            controllers: [RequiredWebhooksController],
        };
    }
}

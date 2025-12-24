import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { CloudshelfModule } from '../cloudshelf/cloudshelf.module';
import { EnsureInstalledOnShopMiddleware } from '../shopify/auth/ensure.installed.on.shop.middleware';
import { SessionModule } from '../shopify/sessions/session.module';
import { ManagerProxyMiddleware } from './manager.proxy.middleware';

@Module({
    imports: [SessionModule, CloudshelfModule],
    providers: [],
    controllers: [],
    exports: [],
})
export class ManagerProxyModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(EnsureInstalledOnShopMiddleware)
            .exclude(
                { path: '/shopify/*path', method: RequestMethod.ALL },
                { path: '/graphql', method: RequestMethod.ALL },
                { path: '/_next/*path', method: RequestMethod.ALL },
                { path: '/static/*path', method: RequestMethod.ALL },
                { path: '/api-health*path', method: RequestMethod.ALL },
                { path: '/favicon.ico', method: RequestMethod.ALL },
                { path: '/stock-levels', method: RequestMethod.ALL },
                { path: '/pos', method: RequestMethod.ALL },
                { path: '/catalog', method: RequestMethod.ALL },
            )
            .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });

        consumer
            .apply(ManagerProxyMiddleware)
            .exclude(
                { path: '/shopify/*path', method: RequestMethod.ALL },
                { path: '/graphql', method: RequestMethod.ALL },
                { path: '/api-health*path', method: RequestMethod.ALL },
                { path: '/stock-levels', method: RequestMethod.ALL },
                { path: '/pos', method: RequestMethod.ALL },
                { path: '/catalog', method: RequestMethod.ALL },
            )

            .forRoutes({ path: '{*splat}', method: RequestMethod.ALL });
    }
}

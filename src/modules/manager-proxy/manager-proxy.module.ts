import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { EnsureInstalledOnShopMiddleware } from '../shopify/auth/ensure.installed.on.shop.middleware';
import { SessionModule } from '../shopify/sessions/session.module';
import { ManagerProxyMiddleware } from './manager.proxy.middleware';

@Module({
    imports: [SessionModule],
    providers: [],
    controllers: [],
    exports: [],
})
export class ManagerProxyModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(EnsureInstalledOnShopMiddleware)
            .exclude(
                { path: '/shopify/(.*)', method: RequestMethod.ALL },
                { path: '/graphql', method: RequestMethod.ALL },
            )
            .forRoutes({ path: '/**', method: RequestMethod.ALL });

        consumer
            .apply(ManagerProxyMiddleware)
            .exclude(
                { path: '/shopify/(.*)', method: RequestMethod.ALL },
                { path: '/graphql', method: RequestMethod.ALL },
            )
            .forRoutes({ path: '/**', method: RequestMethod.ALL });
    }
}

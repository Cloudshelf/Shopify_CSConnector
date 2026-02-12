import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestHandler, createProxyMiddleware } from 'http-proxy-middleware';
import { ExtendedLogger } from '../../utils/ExtendedLogger';
import { CustomTokenService } from '../shopify/sessions/custom.token.service';

@Injectable()
export class ManagerProxyMiddleware implements NestMiddleware {
    readonly logger = new ExtendedLogger('ManagerProxyMiddleware');
    private readonly managerProxy: RequestHandler | undefined = undefined;

    constructor(private readonly customTokenService: CustomTokenService) {
        this.managerProxy = createProxyMiddleware(['**'], {
            target: process.env.CLOUDSHELF_MANAGER_URL!,
            logLevel: 'debug',
            changeOrigin: true,
            cookieDomainRewrite: process.env.HOST!,
            onProxyReq: (proxyReq, req, res) => {
                const queryParams = new URLSearchParams(req.url?.split('?')[1]);
                if (queryParams.has('id_token')) {
                    const idToken = queryParams.get('id_token')!;
                    proxyReq.setHeader('Authorization', `${idToken}`);
                }
                if (queryParams.has('host')) {
                    const host = queryParams.get('host')!;
                    proxyReq.setHeader('x-shopify-host', `${host}`);
                }
                proxyReq.end();
            },
            pathRewrite: async (path, req) => {
                // Parse path query
                const query = path.split('?')[1];
                const params = new URLSearchParams(query);
                if (params.has('shop')) {
                    // Add custom token
                    const shop = params.get('shop')!;
                    const customTokenEntity = await this.customTokenService.loadToken(shop);

                    if (customTokenEntity && customTokenEntity.token) {
                        params.set('id_token', customTokenEntity.token);
                        path = path.split('?')[0] + '?' + params.toString();
                    }
                }
                return path;
            },
        });
    }

    use(req: Request, res: Response, next: NextFunction) {
        if (!this.managerProxy) {
            next();
            return;
        }

        // Only proxy GET requests — manager doesn't accept other methods.
        // Rejecting early prevents ERR_STREAM_WRITE_AFTER_END errors that occur
        // when http-proxy tries to pipe a POST body into an already-ended proxy request.
        if (req.method !== 'GET') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        this.managerProxy(req, res, next);
    }
}

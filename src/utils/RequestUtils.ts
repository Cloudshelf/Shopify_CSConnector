import { Request } from 'express';

export class RequestUtils {
    static getShopDomainFromRequest(request: Request) {
        const params = request.query;
        const shopDomain = (params['shop'] ?? '') as string;
        if (!shopDomain) {
            throw new Error('No shop in fetch, this should never happen!');
        }
        return shopDomain;
    }
    static getShopIdFromRequest(request: Request): string {
        const shopDomain = RequestUtils.getShopDomainFromRequest(request);
        const shopId = shopDomain.replace('.myshopify.com', '');

        return shopId;
    }
}

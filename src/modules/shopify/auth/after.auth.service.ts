import { Injectable } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { SentryInstrument } from '../../apm/sentry.function.instrumenter';
import { RetailerService } from '../../retailer/retailer.service';
import { ShopifySessionEntity } from '../sessions/shopify.session.entity';
import { ShopifyAuthAfterHandler } from '@nestjs-shopify/auth';
import { ShopifyWebhooksService } from '@nestjs-shopify/webhooks';
import { Request, Response } from 'express';

@Injectable()
export class AfterAuthHandlerService implements ShopifyAuthAfterHandler {
    private readonly logger = new ExtendedLogger('AfterAuthHandlerService');

    constructor(
        private readonly retailerService: RetailerService,
        private readonly webhookService: ShopifyWebhooksService,
    ) {}

    @SentryInstrument('AfterAuthHandlerService')
    async afterAuth(req: Request, res: Response, session: ShopifySessionEntity): Promise<void> {
        const { host } = req.query;

        if (session.isOnline) {
            //we don't handle online sessions
            //     if (!(await this.shopsService.exists(shop))) {
            //         return res.redirect(`/api/offline/auth?shop=${shop}`);
            //     }
            //
            //     return res.redirect(`/?shop=${shop}&host=${host}`);

            //Send a bad request response (temp)
            res.status(400).end();
            return;
        }

        if (!session.accessToken) {
            this.logger.error('No access token found in session');
            //Send a bad request response (temp)
            res.status(400).end();
            return;
        }

        if (!session.scope) {
            this.logger.error('No scope found in session');
            //Send a bad request response (temp)
            res.status(400).end();
            return;
        }

        await this.retailerService.findOrCreate(session.shop, session.accessToken, session.scope);
        this.logger.log(`Registering webhooks for shop ${session.shop}`);
        await this.webhookService.registerWebhooks(session);
        res.send('Shop installed: ' + session.shop).end();
        return;

        // return res.redirect(`/?shop=${shop}&host=${host}`);
    }
}

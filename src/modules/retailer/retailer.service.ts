import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CreateRequestContext, EntityManager, MikroORM } from '@mikro-orm/core';
import { NotificationUtils } from '../../utils/NotificationUtils';
import { SentryInstrument } from '../apm/sentry.function.instrumenter';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { UpdateOrCreateStatusType } from '../database/update.or.create.status.type';
import { SlackService } from '../integrations/slack.service';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';
import { RetailerEntity } from './retailer.entity';
import { RetailerUtils } from './retailer.utils';
import { Shopify } from '@shopify/shopify-api';

@Injectable()
export class RetailerService {
    private readonly logger = new Logger('RetailerService');

    constructor(
        //orm is required by CreateRequestContext
        private readonly orm: MikroORM,
        private readonly entityManager: EntityManager,
        private readonly slackService: SlackService,
    ) {}

    @Cron('0 6 * * *', { name: 'retailer-sync-check', timeZone: 'Europe/London' })
    async syncCheckCron() {
        await this.checkAndReportSyncIssues();
    }

    @CreateRequestContext()
    async checkAndReportSyncIssues() {
        //find any retailers where the lastSafetySyncCompleted was more than 48 hours ago (or its null) AND there is not a sync error code
        const retailers = await this.entityManager.find(RetailerEntity, {
            $or: [
                {
                    lastSafetySyncCompleted: {
                        $lt: new Date(Date.now() - 48 * 60 * 60 * 1000),
                    },
                },
                {
                    lastSafetySyncCompleted: {
                        $eq: null,
                    },
                },
            ],
            syncErrorCode: { $eq: null },
        });

        const data = retailers.map(r => {
            return { displayName: r.displayName ?? r.domain, url: r.domain };
        });

        if (data.length > 0) {
            await this.slackService.sendHealthNotification(NotificationUtils.buildSyncIssueNotifications(data));
        }
    }

    @SentryInstrument('RetailerService')
    async updateOrCreate(
        domain: string,
        accessToken: string,
        scopesString: string,
    ): Promise<{ entity: RetailerEntity; status: UpdateOrCreateStatusType }> {
        return RetailerUtils.updateOrCreate(this.entityManager, domain, accessToken, scopesString);
    }

    @SentryInstrument('RetailerService')
    async existsByDomain(domain: string): Promise<boolean> {
        return RetailerUtils.existsByDomain(this.entityManager, domain);
    }

    @SentryInstrument('RetailerService')
    async deleteByDomain(domain: string): Promise<boolean> {
        return RetailerUtils.deleteByDomain(this.entityManager, domain);
    }

    @SentryInstrument('RetailerService')
    async getSharedSecret(domain: string): Promise<string | undefined> {
        return RetailerUtils.getSharedSecret(this.entityManager, domain);
    }

    @SentryInstrument('RetailerService')
    async save(entity: RetailerEntity) {
        return await RetailerUtils.save(this.entityManager, entity);
    }

    @SentryInstrument('RetailerService')
    getById(organisationId: string) {
        return RetailerUtils.getById(this.entityManager, organisationId);
    }

    @SentryInstrument('RetailerService')
    async getByDomain(domain: string) {
        return RetailerUtils.getByDomain(this.entityManager, domain);
    }

    async updateShopInformationFromShopifyOnlineSession(
        shopifyApiInstance: Shopify,
        entity: RetailerEntity,
        session: ShopifySessionEntity,
    ) {
        return await RetailerUtils.updateShopInformationFromShopifyOnlineSession(
            this.entityManager,
            shopifyApiInstance,
            entity,
            session,
        );
    }

    async updateShopInformationFromShopifyGraphql(retailer: RetailerEntity, logs?: LogsInterface) {
        return await RetailerUtils.updateShopInformationFromShopifyGraphql(this.entityManager, retailer, logs);
    }

    async updateLogoFromShopify(retailer: RetailerEntity, logs?: LogsInterface) {
        return RetailerUtils.updateLogoFromShopify(this.entityManager, retailer, logs);
    }

    async getAll(from: number, limit: number) {
        return RetailerUtils.getAll(this.entityManager, from, limit);
    }
}

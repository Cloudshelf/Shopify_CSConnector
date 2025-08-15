import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { UpdateOrCreateStatusType } from '../database/update.or.create.status.type';
import { ShopifySessionEntity } from '../shopify/sessions/shopify.session.entity';
import { TriggerHandlersService } from '../trigger-handlers/trigger-handlers.service';
import { RetailerEntity } from './retailer.entity';
import { RetailerStatus } from './retailer.status.enum';
import { RetailerUtils } from './retailer.utils';
import { Shopify } from '@shopify/shopify-api';
import { Telemetry } from 'src/decorators/telemetry';

@Injectable()
export class RetailerService {
    private readonly logger = new Logger('RetailerService');

    constructor(
        private readonly entityManager: EntityManager,
        private readonly triggerHandlersService: TriggerHandlersService,
    ) {}

    @Telemetry('service.retailer.findOneByStorefrontToken')
    findOneByStorefrontToken(authToken: string) {
        return this.entityManager.findOne(RetailerEntity, { storefrontToken: authToken }, { filters: false });
    }

    @Telemetry('service.retailer.findOneByDomain')
    findOneByDomain(domain: string) {
        return this.entityManager.findOne(RetailerEntity, { domain: domain }, { filters: false });
    }

    @Telemetry('service.retailer.updateOrCreate')
    async updateOrCreate(
        domain: string,
        accessToken: string,
        scopesString: string,
    ): Promise<{ entity: RetailerEntity; status: UpdateOrCreateStatusType }> {
        return RetailerUtils.updateOrCreate(this.entityManager, domain, accessToken, scopesString);
    }

    @Telemetry('service.retailer.existsByDomain')
    async existsByDomain(domain: string): Promise<boolean> {
        return RetailerUtils.existsByDomain(this.entityManager, domain);
    }

    @Telemetry('service.retailer.deleteByDomain')
    async deleteByDomain(domain: string): Promise<boolean> {
        return RetailerUtils.deleteByDomain(this.entityManager, domain);
    }

    @Telemetry('service.retailer.getSharedSecret')
    async getSharedSecret(domain: string): Promise<string | undefined> {
        return RetailerUtils.getSharedSecret(this.entityManager, domain);
    }

    @Telemetry('service.retailer.save')
    async save(entity: RetailerEntity) {
        return await RetailerUtils.save(this.entityManager, entity);
    }

    @Telemetry('service.retailer.getById')
    getById(organisationId: string) {
        return RetailerUtils.getById(this.entityManager, organisationId);
    }

    @Telemetry('service.retailer.getByDomain')
    async getByDomain(domain: string) {
        return RetailerUtils.getByDomain(this.entityManager, domain);
    }

    @Telemetry('service.retailer.updateShopInformationFromShopifyOnlineSession')
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

    @Telemetry('service.retailer.updateShopInformationFromShopifyGraphql')
    async updateShopInformationFromShopifyGraphql(retailer: RetailerEntity, logs?: LogsInterface) {
        return await RetailerUtils.updateShopInformationFromShopifyGraphql(this.entityManager, retailer, logs);
    }

    @Telemetry('service.retailer.updateLogoFromShopify')
    async updateLogoFromShopify(retailer: RetailerEntity, logs?: LogsInterface) {
        return RetailerUtils.updateLogoFromShopify(this.entityManager, retailer, logs);
    }

    @Telemetry('service.retailer.getAll')
    async getAll(from: number, limit: number) {
        return RetailerUtils.getAll(this.entityManager, from, limit);
    }

    @Telemetry('service.retailer.markRetailersAsIdle')
    async markRetailersAsIdle(domains: string[]) {
        this.logger.debug(`Marking retailers as idle: ${domains}`);
        try {
            await this.entityManager.nativeUpdate(
                RetailerEntity,
                { domain: { $in: domains } },
                { status: RetailerStatus.IDLE },
            );
        } catch (error) {
            this.logger.error(`Error marking retailers as idle: ${domains}`, error);
        }
    }

    @Telemetry('service.retailer.cancelTriggersForRetailers')
    async cancelTriggersForRetailers(domains: string[]) {
        const retailers = await this.entityManager.find(RetailerEntity, {
            domain: { $in: domains },
        });

        try {
            await Promise.all(
                retailers.map(retailer =>
                    this.triggerHandlersService.cancelTriggersForDomain({
                        domain: retailer.domain,
                        retailerId: retailer.id,
                    }),
                ),
            );
        } catch (error) {
            this.logger.error(`Error cancelling triggers for retailers: ${domains}`, error);
        }
    }

    @Telemetry('service.retailer.markRetailersAsActive')
    async markRetailersAsActive(domain: string) {
        this.logger.debug(`Marking retailer as active: ${domain}`);
        try {
            const retailer = await this.entityManager.findOne(RetailerEntity, { domain });
            if (!retailer) {
                this.logger.error(`Retailer not found: ${domain}`);
                return;
            }

            if (retailer.status === RetailerStatus.ACTIVE) {
                this.logger.debug(`Retailer is already active: ${domain}`);
                return;
            }

            retailer.status = RetailerStatus.ACTIVE;
            await this.entityManager.persistAndFlush(retailer);
        } catch (error) {
            this.logger.error(`Error marking retailer as active: ${domain}`, error);
        }
    }
}

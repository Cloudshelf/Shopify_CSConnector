import { Injectable } from '@nestjs/common';
import { BulkOperationStatus } from '../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { EntityManager } from '@mikro-orm/core';
import { LogsInterface } from '../cloudshelf/logs.interface';
import { RetailerEntity } from '../retailer/retailer.entity';
import { BulkOperation } from './bulk.operation.entity';
import { BulkOperationType } from './bulk.operation.type';
import { BulkOperationUtils } from './bulk.operation.utils';
import { Telemetry } from 'src/decorators/telemetry';

@Injectable()
export class BulkOperationService {
    constructor(private readonly entityManager: EntityManager) {}

    @Telemetry('service.bulk-operation.create')
    async create(thirdPartyId: string, type: BulkOperationType, retailerDomain: string, fullSync?: boolean) {
        return BulkOperationUtils.create(this.entityManager, thirdPartyId, type, retailerDomain, fullSync);
    }

    @Telemetry('service.bulk-operation.checkForRunningBulkOperationByRetailer')
    async checkForRunningBulkOperationByRetailer(
        retailer: RetailerEntity,
        logFn?: LogsInterface,
    ): Promise<{ status: BulkOperationStatus; id: string } | undefined> {
        return BulkOperationUtils.checkForRunningBulkOperationByRetailer(retailer, logFn);
    }

    @Telemetry('service.bulk-operation.requestBulkOperation')
    async requestBulkOperation(
        retailer: RetailerEntity,
        operationType: BulkOperationType,
        queryPayload: string,
        installSync?: boolean,
        logFn?: LogsInterface,
    ): Promise<BulkOperation> {
        return BulkOperationUtils.requestBulkOperation(
            this.entityManager,
            retailer,
            operationType,
            queryPayload,
            installSync,
            logFn,
        );
    }

    @Telemetry('service.bulk-operation.getOneById')
    async getOneById(id: string) {
        return BulkOperationUtils.getOneById(this.entityManager, id);
    }

    @Telemetry('service.bulk-operation.getOneByThirdPartyId')
    async getOneByThirdPartyId(remoteBulkOperationId: string) {
        return BulkOperationUtils.getOneByThirdPartyId(this.entityManager, remoteBulkOperationId);
    }

    @Telemetry('service.bulk-operation.updateFromShopify')
    async updateFromShopify(retailer: RetailerEntity, bulkOp: BulkOperation) {
        return BulkOperationUtils.updateFromShopify(this.entityManager, retailer, bulkOp);
    }
}

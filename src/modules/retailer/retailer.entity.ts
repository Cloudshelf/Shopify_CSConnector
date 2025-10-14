import { Entity, Index, Property, types } from '@mikro-orm/core';
import { MachineSize } from '../../trigger/reuseables/machines_size';
import { BaseEntity } from '../database/abstract-entities/entity.base';
import { RetailerStatus } from './retailer.status.enum';

@Entity({ tableName: 'retailer_entity' })
export class RetailerEntity extends BaseEntity {
    @Index()
    @Property({ type: 'text', unique: true })
    domain: string;

    @Property({ type: 'text' })
    accessToken: string;

    @Property({ type: 'text', nullable: true })
    sharedSecret: string | null;

    @Property({ type: 'text', nullable: true })
    storefrontToken: string | null;

    @Property({ type: types.array, default: [] })
    scopes: string[];

    @Property({ type: types.datetime, nullable: true })
    lastSafetySyncRequested: Date | null;

    @Property({ type: types.datetime, nullable: true })
    lastSafetySyncCompleted: Date | null;

    @Property({ type: types.datetime, nullable: true })
    lastProductSync: Date | null;

    @Property({ type: types.datetime, nullable: true })
    lastProductGroupSync: Date | null;

    @Property({ type: types.datetime, nullable: true })
    lastPartialSyncRequestTime: Date | null;

    @Property({ type: types.datetime, nullable: true })
    nextPartialSyncRequestTime: Date | null;

    @Property({ type: 'text', nullable: true })
    email: string | null;

    @Property({ type: 'text', nullable: true })
    displayName: string | null;

    @Property({ type: 'text', nullable: true })
    currencyCode: string | null;

    @Property({ type: 'text', nullable: true })
    generatedCloudshelfId: string | null;

    @Property({ type: 'text', nullable: true })
    logoUrlFromShopify: string | null;

    @Property({ type: 'text', nullable: true })
    syncErrorCode: string | null;

    @Property({ type: 'text', nullable: true })
    triggerMachineSizeProducts: MachineSize | null;

    @Property({ type: 'text', nullable: true })
    triggerMachineSizeProductGroups: MachineSize | null;

    @Property({ type: types.integer, nullable: true })
    triggerMaxDurationProducts: number | null;

    @Property({ type: types.integer, nullable: true })
    triggerMaxDurationProductGroups: number | null;

    @Property({ type: 'text', default: 'active' })
    status: RetailerStatus;

    async supportsWithPublicationStatus(): Promise<boolean> {
        return this.scopes.includes('read_product_listings');
    }

    async supportsWriteOrders(): Promise<boolean> {
        return this.scopes.includes('write_orders');
    }

    async supportsWriteCustomers(): Promise<boolean> {
        return this.scopes.includes('write_customers');
    }
}

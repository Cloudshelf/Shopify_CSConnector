import { Entity, Enum, Index, PrimaryKey, Property, types } from '@mikro-orm/core';
import { BaseEntity } from '../database/abstract-entities/entity.base';
import { BulkOperationType } from './bulk.operation.type';

@Entity()
export class BulkOperation extends BaseEntity {
    constructor() {
        super();
        this.dataUrl = null;
        this.startedAt = null;
        this.endedAt = null;
    }

    @Index()
    @Property({ type: 'text' })
    domain!: string;

    @Index()
    @Property({ type: 'text', unique: true })
    shopifyBulkOpId!: string;

    @Property({ type: 'text', nullable: true })
    dataUrl: string | null;

    @Property({ type: types.datetime, nullable: true })
    startedAt: Date | null;

    @Property({ type: types.datetime, nullable: true })
    endedAt: Date | null;

    @Property({ type: 'text', default: '' })
    status!: string;

    @Enum({ items: () => BulkOperationType })
    type!: BulkOperationType;

    @Property({ type: types.boolean, default: false })
    installSync!: boolean;
}

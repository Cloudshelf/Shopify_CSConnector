import { Entity, Property, types } from '@mikro-orm/core';
import { BaseEntity } from '../database/abstract-entities/entity.base';

@Entity()
export class RetailerEntity extends BaseEntity {
    @Property({ type: 'text', unique: true })
    domain!: string;

    @Property({ type: 'text' })
    accessToken!: string;

    @Property({ type: 'text', nullable: true })
    sharedSecret: string | null;

    @Property({ type: 'text', nullable: true })
    storefrontToken: string | null;

    @Property({ type: types.array, default: [] })
    scopes!: string[];

    @Property({ type: types.datetime, nullable: true })
    lastSafetySync: Date | null;

    @Property({ type: types.datetime, nullable: true })
    lastProductSync: Date | null;

    @Property({ type: types.datetime, nullable: true })
    lastProductGroupSync: Date | null;
}

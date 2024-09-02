import { Index, PrimaryKey, Property } from '@mikro-orm/core';
import { ulid } from 'ulid';

export abstract class BaseEntity {
    constructor() {
        this.id = ulid();
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    @Index()
    @PrimaryKey()
    id: string;

    @Property({ defaultRaw: 'NOW()' })
    createdAt: Date;

    @Property({ defaultRaw: 'NOW()', onUpdate: () => new Date() })
    updatedAt: Date;
}

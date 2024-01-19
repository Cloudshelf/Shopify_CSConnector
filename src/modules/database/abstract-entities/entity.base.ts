import { Index, PrimaryKey, Property } from '@mikro-orm/core';
import { ulid } from 'ulid';

export abstract class BaseEntity {
    constructor() {
        this.id = ulid();
    }
    @Index()
    @PrimaryKey()
    id: string;

    @Property({ defaultRaw: 'NOW()' })
    createdAt: Date = new Date();

    @Property({ defaultRaw: 'NOW()', onUpdate: () => new Date() })
    updatedAt: Date = new Date();
}

import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../database/abstract-entities/entity.base';

@Entity()
export class TestEntity extends BaseEntity {
    @Property({ type: 'text', unique: true })
    text!: string;
}

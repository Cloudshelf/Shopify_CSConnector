import { Field, ObjectType } from '@nestjs/graphql';
import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from '../database/abstract-entities/entity.base';

@ObjectType()
@Entity()
export class TestEntity extends BaseEntity {
    @Field()
    @Property({ type: 'text', unique: true })
    text!: string;
}

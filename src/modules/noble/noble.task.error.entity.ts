import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLString } from 'graphql/type';
import { Cascade, Entity, ManyToOne, Property, types } from '@mikro-orm/core';
import { BaseEntity } from '../database/abstract-entities/entity.base';
import { NobleTaskEntity } from './noble.task.entity';

@ObjectType()
@Entity({
    tableName: 'noble_task_error',
})
export class NobleTaskErrorEntity extends BaseEntity {
    @ManyToOne(() => NobleTaskEntity, { cascade: [Cascade.ALL] })
    @Field(() => NobleTaskEntity)
    task: NobleTaskEntity;

    @Property({ type: types.blob })
    @Field(() => GraphQLString)
    message: string;
}

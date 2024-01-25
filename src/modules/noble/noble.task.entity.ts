import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';
import ConnectionType from '../graphql/pagination/pagination.relay.types';
import { GraphQLBoolean, GraphQLString } from 'graphql/type';
import { Collection, Embedded, Entity, Enum, OneToMany, Property, types } from '@mikro-orm/core';
import { BaseEntity } from '../database/abstract-entities/entity.base';
import {
    CollectionConsumerTaskData,
    CollectionTriggerTaskData,
    DebugErrorJobData,
    DebugJobData,
    JobDataUnion,
    LocationJobData,
    NobleTaskDataUnion,
    ProductConsumerTaskData,
    ProductTriggerTaskData,
} from './noble.task.data';
import { NobleTaskErrorEntity } from './noble.task.error.entity';
import { NobleTaskLogEntity } from './noble.task.log.entity';
import { NobleTaskStatus } from './noble.task.status';
import { NobleTaskType } from './noble.task.type';

@ObjectType({ description: 'Represents a background processing job' })
@Entity({
    tableName: 'noble_task',
})
export class NobleTaskEntity extends BaseEntity {
    @Property({ type: types.datetime, nullable: true })
    @Field(() => GraphQLISODateTime, {
        description:
            'The date time this job is schedule to run at. Note that this is not a guaranteed time, its simple the earliest it can run.',
    })
    scheduledStart?: Date;

    @Enum(() => NobleTaskType)
    @Field(() => NobleTaskType)
    taskType: NobleTaskType;

    @Field(() => NobleTaskDataUnion, { nullable: true })
    @Embedded({
        entity: () => [
            DebugJobData,
            DebugErrorJobData,
            ProductTriggerTaskData,
            ProductConsumerTaskData,
            CollectionTriggerTaskData,
            CollectionConsumerTaskData,
            LocationJobData,
        ],
        prefix: 'data',
        array: false,
        object: true,
        nullable: true,
    })
    data?:
        | DebugJobData
        | DebugErrorJobData
        | ProductTriggerTaskData
        | ProductConsumerTaskData
        | CollectionTriggerTaskData
        | CollectionConsumerTaskData
        | LocationJobData;

    @Field(() => GraphQLString, { nullable: true })
    jsonData?: string;

    @Property({ type: types.text, nullable: true })
    @Field(() => GraphQLString, { nullable: true })
    organisationId?: string;

    @Property({ type: types.text, nullable: true })
    @Field(() => GraphQLString, { nullable: true })
    beingProcessedBy?: string | null;

    @OneToMany(() => NobleTaskLogEntity, logEntity => logEntity.task)
    @Field(() => [NobleTaskLogEntity])
    logMessages = new Collection<NobleTaskLogEntity>(this);

    @OneToMany(() => NobleTaskErrorEntity, logEntity => logEntity.task)
    @Field(() => [NobleTaskErrorEntity])
    errors = new Collection<NobleTaskErrorEntity>(this);

    @Property({ type: types.boolean, default: false })
    @Field()
    isComplete: boolean;

    @Property({ type: types.integer, default: 0 })
    @Field()
    retries: number;

    @Property({ type: types.boolean, default: false })
    @Field(() => GraphQLBoolean)
    failed: boolean;

    @Property({ type: types.datetime, nullable: true })
    @Field(() => GraphQLISODateTime, {
        description: 'The time this job started',
    })
    startTime?: Date | null;

    @Property({ type: types.datetime, nullable: true })
    @Field(() => GraphQLISODateTime, {
        description: 'The time this job started',
    })
    finishTime?: Date | null;

    @Property({ type: types.integer, default: 0 })
    @Field()
    priority: number;

    @Field(() => NobleTaskStatus)
    status: NobleTaskStatus;

    queueMaxRetries = 100;

    getStatus(): NobleTaskStatus {
        if (this.failed) {
            return NobleTaskStatus.Failed;
        }
        if (this.isComplete) {
            return NobleTaskStatus.Complete;
        }
        if (this.beingProcessedBy && this.startTime) {
            return NobleTaskStatus.InProgress;
        }
        return NobleTaskStatus.Pending;
    }
}

@ObjectType()
export class NobleTaskResponse extends ConnectionType<NobleTaskEntity>(NobleTaskEntity) {}

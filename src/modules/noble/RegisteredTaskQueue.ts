import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLInt } from 'graphql/type';
import { NobleTaskEntity, NobleTaskResponse } from './noble.task.entity';
import { NobleTaskType } from './noble.task.type';
import async from 'async';

export type TrackedTaskProcessor = (task: NobleTaskEntity) => Promise<void>;

@ObjectType()
export class TaskQueue {
    @Field()
    name!: string; // Queue name

    @Field()
    concurrency!: number; // How many workers, per instance, to use for this queue

    @Field()
    noTasksDelay!: number; // How long, in ms, to sleep if no tasks were found

    @Field()
    taskDelay!: number; // How long, in ms, to wait before a task starts (must be at least this old to be picked up)

    @Field()
    retries!: number; // How many times to retry a failed task

    @Field(() => NobleTaskType)
    taskType!: NobleTaskType; // The type of task this queue processes

    @Field(() => GraphQLInt)
    activeWorkers?: number;

    @Field(() => NobleTaskResponse)
    tasks?: NobleTaskResponse;

    processor!: TrackedTaskProcessor; // The task processor function

    limitOnePerStore = true;
}

export interface RegisteredTaskQueue {
    taskQueue: TaskQueue;
    asyncQueue: async.QueueObject<NobleTaskType>;
    nextTask?: NobleTaskEntity;
    paused?: boolean;
}

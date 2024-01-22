import { Logger } from '@nestjs/common';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthenticatedGraphqlRequest } from '../graphql/guards/authenticated.graphql.request.guard';
import { GraphQLBoolean, GraphQLString } from 'graphql';
import { NobleService } from './noble.service';
import { DebugErrorJobData, DebugJobData } from './noble.task.data';
import { NobleTaskEntity } from './noble.task.entity';
import { NobleTaskLogEntity } from './noble.task.log.entity';
import { NobleTaskStatus } from './noble.task.status';
import { NobleTaskType } from './noble.task.type';

@Resolver(() => NobleTaskEntity)
export class NobleTaskResolver {
    private readonly logger = new Logger(NobleTaskResolver.name);

    constructor(private readonly nobleService: NobleService) {}

    @Query(() => GraphQLBoolean)
    async queueDebug(): Promise<boolean> {
        const data = new DebugJobData();
        data.dataType = 'debug';
        data.debugText = 'debug text';

        await this.nobleService.scheduleTask<DebugJobData>(NobleTaskType.Debug, undefined, data, undefined, 15);
        return true;
    }

    @Query(() => GraphQLBoolean)
    async queueDebugError(): Promise<boolean> {
        const a = new DebugErrorJobData();
        a.dataType = 'debug-error';

        await this.nobleService.scheduleTask<DebugErrorJobData>(NobleTaskType.DebugError, undefined, a, undefined, 15);
        return true;
    }

    @ResolveField(() => GraphQLString)
    @AuthenticatedGraphqlRequest()
    async data(@Parent() task: NobleTaskEntity): Promise<string> {
        return JSON.stringify(task.data);
    }

    @Query(() => NobleTaskEntity, { nullable: true })
    @AuthenticatedGraphqlRequest()
    async nobleTask(@Args({ type: () => GraphQLString, name: 'id' }) id: string): Promise<NobleTaskEntity | null> {
        return this.nobleService.findOneById(id);
    }

    @Mutation(() => GraphQLBoolean)
    @AuthenticatedGraphqlRequest()
    async deleteTask(@Args({ type: () => GraphQLString, name: 'id' }) id: string): Promise<boolean> {
        await this.nobleService.deleteTaskById(id);
        return true;
    }

    @Mutation(() => GraphQLBoolean)
    @AuthenticatedGraphqlRequest()
    async restartTask(@Args({ type: () => GraphQLString, name: 'id' }) id: string): Promise<boolean> {
        const task = await this.nobleService.findOneById(id);

        if (!task) {
            return false;
        }

        const logMessages = new NobleTaskLogEntity();
        logMessages.task = task;
        logMessages.message = `Task progress was reset to allow noble to restart it`;

        task.beingProcessedBy = null;
        task.isComplete = false;
        task.failed = false;
        task.retries = 0;
        task.logMessages.removeAll();
        task.logMessages.add(logMessages);
        task.errors.removeAll();
        task.status = NobleTaskStatus.Pending;
        task.startTime = null;
        task.finishTime = null;
        await this.nobleService.saveOne(task);
        return true;
    }

    @Mutation(() => GraphQLBoolean)
    @AuthenticatedGraphqlRequest()
    async promoteTask(@Args({ type: () => GraphQLString, name: 'id' }) id: string): Promise<boolean> {
        const task = await this.nobleService.findOneById(id);

        if (!task) {
            return false;
        }

        task.priority++;
        await this.nobleService.saveOne(task);
        return true;
    }

    @Mutation(() => GraphQLBoolean)
    @AuthenticatedGraphqlRequest()
    async restartLongRunningJobs(): Promise<boolean> {
        await this.nobleService.restartLongRunningJobs();

        return true;
    }

    @ResolveField(() => NobleTaskStatus)
    @AuthenticatedGraphqlRequest()
    async status(@Parent() parent: NobleTaskEntity): Promise<NobleTaskStatus> {
        return parent.getStatus();
    }
}

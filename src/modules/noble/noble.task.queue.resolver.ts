import { Logger } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthenticatedGraphqlRequest } from '../graphql/guards/authenticated.graphql.request.guard';
import PaginationArgs, { buildPagination } from '../graphql/pagination/pagination.relay.args';
import { connectionWithTotalCountFromArraySlice } from '../graphql/pagination/pagination.relay.utils';
import { GraphQLInt } from 'graphql';
import { TaskQueue } from './RegisteredTaskQueue';
import { NobleService } from './noble.service';
import { NobleTaskResponse } from './noble.task.entity';
import { NobleTaskStatus } from './noble.task.status';
import { NobleTaskType } from './noble.task.type';

@Resolver(() => TaskQueue)
export class NobleTaskQueueResolver {
    constructor(private readonly nobleService: NobleService) {}
    private readonly logger = new Logger(NobleTaskQueueResolver.name);

    // @Query(() => NobleHealth)
    // async nobleHealth(): Promise<NobleHealth> {
    //     return this.nobleService.getHealth();
    // }

    // @Mutation(() => GraphQLBoolean)
    // async healthCheckNotifier(@Args({ type: () => GraphQLString, name: 'key' }) key: string): Promise<boolean> {
    //     if (key !== process.env.NOBLE_KEY) {
    //         return false;
    //     }
    //
    //     const webhookURL = this.slackWebhookService.getMonitorWebhookUrl();
    //
    //     const health = await this.nobleHealth();
    //     const nobleRecord = await this.toolsService.getNobleRecord();
    //     await this.toolsService.setNobleStatus(health.status);
    //
    //     if (health.status !== NobleHealthStatus.OK) {
    //         //Noble is having an issue...
    //         if (nobleRecord.lastNobleStatus !== health.status) {
    //             if (health.status === NobleHealthStatus.DEGRADED) {
    //                 //Noble was in an error state, but is now degraded. so its improving
    //                 await this.slackWebhookService.sendSlackMessage(webhookURL, {
    //                     username: 'Cloudshelf',
    //                     text: ` `,
    //                     attachments: [
    //                         {
    //                             color: '#FFFF00',
    //                             blocks: [
    //                                 {
    //                                     type: 'section',
    //                                     text: {
    //                                         type: 'mrkdwn',
    //                                         text: `Nobles health is not ideal!`,
    //                                     },
    //                                 },
    //                                 {
    //                                     type: 'section',
    //                                     text: {
    //                                         type: 'mrkdwn',
    //                                         text: `Status is now *${health.status}*, and was previously *${nobleRecord.lastNobleStatus}*`,
    //                                     },
    //                                 },
    //                             ],
    //                         },
    //                     ],
    //                 });
    //             } else {
    //                 //Noble is in an error state, and was not in an error state before, so its got worse
    //                 await this.slackWebhookService.sendSlackMessage(webhookURL, {
    //                     username: 'Cloudshelf',
    //                     text: ` `,
    //                     attachments: [
    //                         {
    //                             color: '#FF0000',
    //                             blocks: [
    //                                 {
    //                                     type: 'section',
    //                                     text: {
    //                                         type: 'mrkdwn',
    //                                         text: `Nobles health has declined!`,
    //                                     },
    //                                 },
    //                                 {
    //                                     type: 'section',
    //                                     text: {
    //                                         type: 'mrkdwn',
    //                                         text: `Status is now *${health.status}*, and was previously *${nobleRecord.lastNobleStatus}*`,
    //                                     },
    //                                 },
    //                             ],
    //                         },
    //                     ],
    //                 });
    //             }
    //         } else {
    //             //Noble is still having an issue
    //             await this.slackWebhookService.sendSlackMessage(webhookURL, {
    //                 username: 'Cloudshelf',
    //                 text: ` `,
    //                 attachments: [
    //                     {
    //                         color: '#FFFF00',
    //                         blocks: [
    //                             {
    //                                 type: 'section',
    //                                 text: {
    //                                     type: 'mrkdwn',
    //                                     text: `Nobles health is still *${health.status}*`,
    //                                 },
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             });
    //         }
    //     } else {
    //         //Noble is healthy
    //         if (nobleRecord.lastNobleStatus !== NobleHealthStatus.OK) {
    //             await this.slackWebhookService.sendSlackMessage(webhookURL, {
    //                 username: 'Cloudshelf',
    //                 text: ` `,
    //                 attachments: [
    //                     {
    //                         color: '#00FF00',
    //                         blocks: [
    //                             {
    //                                 type: 'section',
    //                                 text: {
    //                                     type: 'mrkdwn',
    //                                     text: `Nobles health has recovered!`,
    //                                 },
    //                             },
    //                             {
    //                                 type: 'section',
    //                                 text: {
    //                                     type: 'mrkdwn',
    //                                     text: `Status is now *${health.status}*, and was previously *${nobleRecord.lastNobleStatus}*`,
    //                                 },
    //                             },
    //                         ],
    //                     },
    //                 ],
    //             });
    //         }
    //     }
    //     return true;
    // }

    @Query(() => [TaskQueue])
    @AuthenticatedGraphqlRequest()
    async nobleQueues(): Promise<TaskQueue[]> {
        return this.nobleService.getQueues();
    }

    @Query(() => TaskQueue)
    @AuthenticatedGraphqlRequest()
    async nobleQueueByTaskType(
        @Args({ type: () => NobleTaskType, name: 'taskType' }) taskType: NobleTaskType,
    ): Promise<TaskQueue | undefined> {
        return this.nobleService.getQueueByTaskType(taskType);
    }

    @ResolveField(() => GraphQLInt)
    @AuthenticatedGraphqlRequest()
    async activeWorkers(@Parent() parent: TaskQueue): Promise<number> {
        return this.nobleService.getActiveWorkers(parent);
    }

    @ResolveField(() => NobleTaskResponse, { name: 'tasks' })
    @AuthenticatedGraphqlRequest()
    async tasksByQueue(
        @Parent() parent: TaskQueue,
        @Args() args: PaginationArgs,
        @Args({ type: () => [NobleTaskStatus], name: 'searchTypes', nullable: true }) searchTypes?: NobleTaskStatus[],
    ): Promise<NobleTaskResponse> {
        return this.nobleTasksByTypes(args, [parent.taskType], searchTypes);
    }

    @Query(() => NobleTaskResponse)
    @AuthenticatedGraphqlRequest()
    async nobleTasksByTypes(
        @Args() args: PaginationArgs,
        @Args({ type: () => [NobleTaskType], name: 'types', nullable: true }) types?: NobleTaskType[],
        @Args({ type: () => [NobleTaskStatus], name: 'searchTypes', nullable: true }) searchTypes?: NobleTaskStatus[],
    ): Promise<NobleTaskResponse> {
        const pagination = buildPagination(args);
        const [tasks, count] = await this.nobleService.getTrackedTasksByTypes(pagination, types, searchTypes);

        return connectionWithTotalCountFromArraySlice(tasks, args, {
            arrayLength: count,
            sliceStart: pagination.offset ?? 0,
        });
    }
}

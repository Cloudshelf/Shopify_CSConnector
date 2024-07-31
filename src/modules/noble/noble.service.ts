import { BeforeApplicationShutdown, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import { ConfigService } from "@nestjs/config";
import { ulid } from "ulid";
import { runtimeSchema } from "../configuration/schemas/runtime.schema";
import { NobleTaskType } from "./noble.task.type";
import { NobleTaskEntity } from "./noble.task.entity";
import * as _ from "lodash";
import { NobleTaskStatus } from "./noble.task.status";
import { addSeconds, format, isFuture, subHours, subMinutes } from "date-fns";
import { RegisteredTaskQueue, TaskQueue } from "./RegisteredTaskQueue";
import async from "async";
import { CreateRequestContext, MikroORM } from "@mikro-orm/core";
import { ClsService } from "nestjs-cls";
import { Pagination } from "../graphql/pagination/pagination.relay.types";
import { ExtendedLogger } from "../../utils/ExtendedLogger";
import { MiscellaneousUtils } from "../../utils/MiscellaneousUtils";
import { NobleTaskLogEntity } from "./noble.task.log.entity";
import { NobleTaskErrorEntity } from "./noble.task.error.entity";
import { JobDataUnion } from "./noble.task.data";
import { Cron } from "@nestjs/schedule";
import { BulkOperation } from "../data-ingestion/bulk.operation.entity";
import { RetailerEntity } from "../retailer/retailer.entity";
import { CloudshelfApiService } from "../cloudshelf/cloudshelf.api.service";

@Injectable()
export class NobleService implements BeforeApplicationShutdown, OnApplicationBootstrap {
    private readonly logger = new ExtendedLogger(NobleService.name);
    private static readonly queues: { [key: string]: RegisteredTaskQueue } = {};
    private static paused = true;
    private applicationShutdown = false;
    private isInitialized = false;
    private instanceId = ulid();

    constructor(
       //Yes this IS needed, it's used by the @CreateRequestContext decorator
        private readonly orm: MikroORM,
        private readonly entityManager: EntityManager,
        private readonly configService: ConfigService<typeof runtimeSchema>,
        private readonly cls: ClsService,
      private readonly cloudshelfApiService: CloudshelfApiService,
    ) {}

    @Cron('*/5 * * * *', { name: 'restart-stuck-jobs', timeZone: 'Europe/London' })
    async restartStuckJobsCron() {
        console.log('Restarting stuck jobs cron');
        await this.restartStuckJobs();
    }

    @Cron('0 3 * * *', { name: 'old-job-cleanup', timeZone: 'Europe/London' })
    async oldJobCron() {
        console.log('Cleaning up old jobs');
        await this.cleanupOldJobs();
    }


    @CreateRequestContext()
    async restartStuckJobs() {
        console.log('Restarting stuck jobs cron');
        await this.restartLongRunningJobs();
    }

    @CreateRequestContext()
    async cleanupOldJobs() {
        console.log('cleanupOldJobs cron');
        await this.pruneJobs();

    }

    isBackgroundMicroserviceEnabled(): boolean {
        return this.configService.get<boolean>('RUN_NOBLE') === true;
    }

    async onApplicationBootstrap() {
        if (this.configService.get('RELEASE_TYPE') !== 'production') {
            // Debug success
            await this.registerQueue({
                taskType: NobleTaskType.Debug,
                processor: async (task) => {
                    console.log('Processing Task!');
                    await MiscellaneousUtils.sleep(5000);
                    await this.addTimedLogMessage(task, 'Done!');
                },
                concurrency: 1,
                name: 'Debug',
                retries: 1,
                noTasksDelay: 1000,
                taskDelay: 50,
                limitOnePerStore: false,
            });

            // Debug fail
            await this.registerQueue({
                taskType: NobleTaskType.DebugError,
                processor: async () => {
                    await MiscellaneousUtils.sleep(2000);
                    throw new Error('some error message');
                },
                concurrency: 1,
                name: 'Debug (Error)',
                retries: 30,
                noTasksDelay: 1000,
                taskDelay: 50,
                limitOnePerStore: false,
            });
        }

        if (this.isBackgroundMicroserviceEnabled()) {
            void this.startTaskFetcher();
        }
        this.isInitialized = true;
    }

    @CreateRequestContext()
    async startTaskFetcher() {
        this.logger.log('Starting task fetcher...');
        while(!this.applicationShutdown) {
            //todo: Check if we should pause noble.
            NobleService.paused = false;

            if(NobleService.paused) {
                await MiscellaneousUtils.sleep(2500);
                continue;
            }

            for await (const key of Object.keys(NobleService.queues)) {
                await MiscellaneousUtils.sleep(100);
                const registeredQueue = NobleService.queues[key];
                if (registeredQueue && !registeredQueue.nextTask && !registeredQueue.paused) {
                    const queue = registeredQueue.taskQueue;
                    try {
                        const nextJob = await this.getNextTask(
                          queue.taskType,
                          queue.retries,
                          queue.noTasksDelay,
                          queue.taskDelay,
                          queue.limitOnePerStore,
                          this.instanceId,
                        );

                        if (nextJob) {
                            nextJob.queueMaxRetries = queue.retries;
                            registeredQueue.nextTask = nextJob;
                        } else {
                            await MiscellaneousUtils.sleep(2000);
                        }
                    } catch {}
                }
            }
        }
    }

    @CreateRequestContext()
    async beforeApplicationShutdown(signal?: string) {
        this.logger.warn('Shutting down noble service due to signal: ' + signal);
        this.applicationShutdown = true;
        const activeJobs = await this.entityManager.find(NobleTaskEntity, {
            beingProcessedBy: this.instanceId,
        }, {populate: ["logMessages", "errors"]});


        for (const job of activeJobs) {
            const logMessage = new NobleTaskLogEntity();
            logMessage.task = job;
            logMessage.message = 'Job was killed by system shutdown';

            job.logMessages.add(logMessage);
            job.beingProcessedBy = null;
        }

        await this.entityManager.persistAndFlush(activeJobs);
    }

    public initialized() {
        return this.isInitialized;
    }

    async registerQueue(queue: TaskQueue): Promise<RegisteredTaskQueue | undefined> {
        let registeredQueue: RegisteredTaskQueue | undefined;
        const backgroundEnabled = this.isBackgroundMicroserviceEnabled();
        if (!(queue.name in NobleService.queues)) {
            // Create the queue
            const asyncQueue = async.queue(async (taskType: NobleTaskType) => {
                const workerId = ulid();
                await this.executeTask(workerId, taskType, queue.limitOnePerStore, queue.processor);
            }, queue.concurrency);
            asyncQueue.pause();
            // Register it

            registeredQueue = {
                asyncQueue,
                taskQueue: queue,
            };

            NobleService.queues[queue.name] = registeredQueue;

            // Queue up enough tasks for the concurrency
            for (let i = 0; i < queue.concurrency; i++) {
                if (backgroundEnabled) {
                    this.logger.log(`Registering worker ${i} for TrackedTaskType ${queue.taskType}`)
                    asyncQueue.push(queue.taskType, (e?: Error | null) => {
                        if (registeredQueue) {
                            this.onFinish(registeredQueue, e);
                        }
                    });
                }
            }

            // Start the queue
            if (backgroundEnabled) {
                asyncQueue.resume();
            }
        } else {
            registeredQueue = NobleService.queues[queue.name];
        }
        return registeredQueue;
    }

    async queueNewTask(registeredQueue: RegisteredTaskQueue) {
        await registeredQueue.asyncQueue.push(registeredQueue.taskQueue.taskType, (e?: Error | null) =>
            this.onFinish(registeredQueue, e),
        );
    }

    async onFinish(registeredQueue: RegisteredTaskQueue, err?: Error | null) {
        await this.queueNewTask(registeredQueue);
    }

    async findOneById(id: string): Promise<NobleTaskEntity | null> {
        return this.entityManager.findOne(NobleTaskEntity, { id }, {disableIdentityMap: true});
    }

    async findByOrganisationIdAndType(organisationId: string, type: NobleTaskType): Promise<NobleTaskEntity[]> {
        const tasks=  await this.entityManager.find(NobleTaskEntity, { organisationId, taskType: type });

        return tasks.filter((task) => task.getStatus() === NobleTaskStatus.Pending);
    }

    async saveOne(task: NobleTaskEntity): Promise<NobleTaskEntity> {
        await this.entityManager.persistAndFlush(task);

        return task;
    }

    async setComplete(task: NobleTaskEntity) {
        task.isComplete = true;
        task.finishTime = new Date();
        await this.saveOne(task);
    }

    async markRetryNeeded(task: NobleTaskEntity, error: string) {
        const errorLog = new NobleTaskErrorEntity();
        errorLog.task = task;
        errorLog.message = error;
        task.errors.add(errorLog);

        task.beingProcessedBy = null;
        task.retries++;

        //find the queue for this task without using lodash
        const queue = Object.keys(NobleService.queues).map((key) => NobleService.queues[key]).find((queue) => queue.taskQueue.taskType === task.taskType);

        if (queue && task.retries >= queue.taskQueue.retries) {
            await this.markFailed(task, error);
        } else {
            task.startTime = null;
            task.finishTime = null;
            await this.saveOne(task);
        }
    }

    async markFailed(task: NobleTaskEntity, error: string) {
        const errorLog = new NobleTaskErrorEntity();
        errorLog.task = task;
        errorLog.message = error;
        task.errors.add(errorLog);
        task.failed = true;
        task.finishTime = new Date();
        await this.saveOne(task);
    }

    async addLogMessage(task: NobleTaskEntity, message: string) {
        const logMessage = new NobleTaskLogEntity();
        logMessage.task = task;
        logMessage.message = message;
        task.logMessages.add(logMessage);

        await this.saveOne(task);
    }

    async addTimedLogMessage(task: NobleTaskEntity, message: string, forcedLog = false) {

        if(task.organisationId === '01HND084GBP1JGJ5VGYRHG935G') {
            forcedLog = true;
        }

        if (task.retries >= task.queueMaxRetries || forcedLog) {
            const dateTime = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
            const timedMessage = `[${dateTime}] ${message}`;
            return this.addLogMessage(task, timedMessage);
        }
    }

    async setProcessedBy(task: NobleTaskEntity, processedBy?: string) {
        try {
            task.beingProcessedBy = processedBy ? processedBy : null;

            await this.saveOne(task);
        } catch (e) {
            console.log();
        }
    }

    async updateData<T extends JobDataUnion>(task: NobleTaskEntity, data: T) {
        task.data = data;
        const returned = await this.saveOne(task);
        return <T>returned.data;
    }

    async setStartTime(task: NobleTaskEntity): Promise<NobleTaskEntity> {
        // eslint-disable-next-line prettier/prettier
        task.startTime = new Date(Date.now());

        return await this.saveOne(task);
    }

    async scheduleTask<T extends JobDataUnion>(
        taskType: NobleTaskType,
        organisationId?: string,
        data?: T,
        priority?: number,
        delay?: number,
    ): Promise<NobleTaskEntity> {
        const newTask = new NobleTaskEntity();
        newTask.retries = 0;
        newTask.organisationId = organisationId;
        newTask.data = data;
        newTask.taskType = taskType;
        newTask.priority = priority ?? 0;
        if (delay) {
            newTask.scheduledStart = addSeconds(new Date(), delay);
        }

        await this.entityManager.persistAndFlush(newTask);

        return newTask;
    }

    getQueues(): TaskQueue[] {
        return Object.keys(NobleService.queues).map((key) => NobleService.queues[key].taskQueue);
    }

    getQueueByTaskType(taskType: NobleTaskType): TaskQueue | undefined {
        const queue = Object.keys(NobleService.queues).map((key) => NobleService.queues[key]).find((queue) => queue.taskQueue.taskType === taskType);
        return queue?.taskQueue;
    }

    async getActiveWorkers(taskQueue: TaskQueue): Promise<number> {
        const records = await this.entityManager.find(NobleTaskEntity, {
            beingProcessedBy: {$ne: null},
            startTime: {$ne: null},
            taskType: taskQueue.taskType,
        });


        return records.length;
    }

    async getNextTask(
        type: NobleTaskType,
        retries: number,
        noTasksDelay: number,
        taskDelay: number,
        limitOnePerStore: boolean,
        instanceId: string,
    ): Promise<NobleTaskEntity | undefined> {
        if (NobleService.paused) {
            return undefined;
        }

        const query = `UPDATE "noble_task"
        SET "being_processed_by" = '${instanceId}'
        WHERE "noble_task".id IN (
        SELECT "noble_task".id
        FROM "noble_task"
        WHERE ("noble_task"."being_processed_by" IS NULL OR "noble_task"."updated_at" < (NOW() - INTERVAL '30 minutes')) ${
            limitOnePerStore
            ? `AND "noble_task"."organisation_id" NOT IN ( 
                            SELECT "noble_task"."organisation_id"
                            FROM "noble_task" 
                            WHERE "noble_task"."being_processed_by" IS NOT NULL
                        )`
            : ``
        }
        AND "noble_task"."retries" < ${retries}
        AND "noble_task"."is_complete" <> TRUE
        AND "noble_task"."failed" <> TRUE
        AND "noble_task"."task_type" = '${type.toString()}' 
        AND "noble_task"."created_at" < (NOW() - INTERVAL '${taskDelay} milliseconds')
        AND ("noble_task"."scheduled_start" IS NULL 
        OR "noble_task"."scheduled_start" < NOW())
        ORDER BY "noble_task"."priority" DESC, "noble_task"."created_at" ASC
        LIMIT 1 
        FOR UPDATE SKIP LOCKED) 
        
        RETURNING *; `


        const returned: NobleTaskEntity[] = await this.entityManager.execute<NobleTaskEntity[]>(query);

        if(!returned || !Array.isArray(returned) || returned.length !== 1) {
            return undefined;
        }

        const realTask =  await this.entityManager.findOne(NobleTaskEntity, {id: returned[0].id}, {logging: { enabled: false}, disableIdentityMap: true});
        return realTask ?? undefined;
    }

    @CreateRequestContext()
    async executeTask(
        workerId: string,
        taskType: NobleTaskType,
        limitOnePerStore: boolean,
        callback: (task: NobleTaskEntity) => Promise<void>,
    ) {
        await this.cls.run(async () => {
            await MiscellaneousUtils.sleep(100);
            const queue = Object.keys(NobleService.queues).map((key) => NobleService.queues[key]).find((queue) => queue.taskQueue.taskType === taskType);

            if (!queue) {
                return;
            }

            let taskId: string | undefined;
            let task: NobleTaskEntity | undefined;
            try {
                taskId = queue.nextTask?.id;
                if(taskId) {
                    task = await this.findOneById(taskId) ?? undefined;
                    if (task) {
                        queue.nextTask = undefined;
                        await this.setStartTime(task);
                        await this.addLogMessage(
                          task,
                          `${workerId} is processing task ${task.id} running version ${process.env.PACKAGE_VERSION} and release type ${process.env.RELEASE_TYPE}`,
                        );


                        await callback(task);

                        // Handle rescheduling
                        const secondaryTask = await this.findOneById(task.id);
                        if (!secondaryTask) {
                            throw new Error('Task disappeared during execution!!');
                        } else {
                            task = secondaryTask;
                        }
                        if (task.scheduledStart && isFuture(task.scheduledStart)) {
                            // This has been rescheduled, so it's not complete :)
                        } else {
                            await this.setComplete(task);
                        }
                    }
                }
            } catch (err) {
                // Sentry.captureException(err);
                if (task !== undefined) {
                    const errStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
                    console.log(`Failed to process task with type ${taskType}:${errStr}`);

                    await this.addTimedLogMessage(task, `Failed to process task with type ${taskType} : ${errStr}`, true);
                    await this.markRetryNeeded(task, errStr);

                    if(task.organisationId) {
                        if (err.message.toLowerCase().includes('received status code 402')) {
                            const foundOrg = await this.entityManager.findOne(RetailerEntity, { id: task.organisationId });
                            if (foundOrg) {
                                foundOrg.syncErrorCode = '402';
                                this.entityManager.persist(foundOrg);

                                await this.cloudshelfApiService.reportCatalogStats(foundOrg.domain, {storeClosed: true}, async logMessage => {
                                    await this.addTimedLogMessage(task!, logMessage);
                                });
                            }
                        }
                        if (err.message.toLowerCase().includes('received status code 404')) {
                            const foundOrg = await this.entityManager.findOne(RetailerEntity, { id: task.organisationId });
                            if (foundOrg) {
                                foundOrg.syncErrorCode = '404';
                                this.entityManager.persist(foundOrg);

                                await this.cloudshelfApiService.reportCatalogStats(foundOrg.domain, {storeClosed: true}, async logMessage => {
                                    await this.addTimedLogMessage(task!, logMessage);
                                });
                            }

                        }

                        if (err.message.toLowerCase().includes('received status code 401')) {
                            const foundOrg = await this.entityManager.findOne(RetailerEntity, { id: task.organisationId });
                            if (foundOrg) {
                                foundOrg.syncErrorCode = '401';
                                this.entityManager.persist(foundOrg);

                                await this.cloudshelfApiService.reportCatalogStats(foundOrg.domain, {storeClosed: true}, async logMessage => {
                                    await this.addTimedLogMessage(task!, logMessage);
                                });
                            }

                        }
                    }
                }
            } finally {
                if (task) {
                    await this.setProcessedBy(task, undefined);
                }
            }
        });
    }

    async hasQueuedTaskByType(taskType: NobleTaskType): Promise<boolean> {

        const count = await this.entityManager.count(NobleTaskEntity, {
                failed: false,
                isComplete: false,
                taskType: taskType,
            },
        );


        return count !== 0;
    }

    async hasQueuedTaskByTypeAndDataAndPossibleOrganisationId(
        taskType: NobleTaskType,
        clause?: string,
        organisationId?: string,
    ): Promise<boolean> {
        const qb = this.entityManager.createQueryBuilder(NobleTaskEntity, 'noble_task');

        qb.count().where({
            taskType,
            isComplete: false,
            failed: false,
            beingProcessedBy: null,
        });

        if(organisationId) {
            qb.andWhere({organisationId});
        }

        if(clause) {
            qb.andWhere(clause);
        }

        const result = await qb.execute();

        return result && result.count !== undefined && result.count !== 0;
    }

    async getPendingOrInProgressTasksByOrganisationId(organisationId: string): Promise<NobleTaskEntity[]> {
        const results = await this.entityManager.find(NobleTaskEntity, {
                failed: false,
                isComplete: false,
                organisationId: organisationId,
            },
        );

        return results;
    }

    async rescheduleTask(task: NobleTaskEntity, date: Date) {
        const newData = _.clone(task.data) as any;
        newData.reschedules = !!newData.reschedules ? newData.reschedules + 1 : 1;
        await this.updateData(task, newData);
        task.scheduledStart = date;
        await this.entityManager.persistAndFlush(task);
    }

    async cancelTask(task: NobleTaskEntity, reason: string) {
        await this.addLogMessage(task, `TASK CANCELLED. REASON: ${reason}`);
        await this.setComplete(task);
    }

    async pruneJobs() {
        await this.entityManager.nativeDelete(NobleTaskEntity, {
            isComplete: true,
            finishTime: {$ne: null,  $lt: subHours(new Date(), 24 * 7)}
        })

        await this.entityManager.nativeDelete(NobleTaskEntity, {
            failed: true,
            finishTime: {$ne: null,  $lt: subHours(new Date(), 24 * 7)}
        })

        //clean up Bulk Ops
        await this.entityManager.nativeDelete(BulkOperation, {
            endedAt: {$ne: null,  $lt: subHours(new Date(), 24 * 7)}
        })
    }

    async restartLongRunningJobs() {
        console.log('restartLongRunningJobs');
        const longRunningTasks = await this.entityManager.find(NobleTaskEntity, {
            beingProcessedBy: {$ne: null},
            // isComplete: false,
            // failed: false,
            updatedAt: {$lt: subMinutes(new Date(), 60)}
        });
        console.log('longRunningTasks: ', longRunningTasks.length);

        for (const task of longRunningTasks) {
            const resetLog = new NobleTaskLogEntity();
            resetLog.task = task;
            resetLog.message = 'Task progress was reset by cloudshelf worker service, because the job appeared to be stuck';

            task.beingProcessedBy = null;
            task.priority = task.priority + 10;
            task.logMessages.add(resetLog);
            task.retries = 0;
            task.errors.removeAll();
            task.status = NobleTaskStatus.Pending;
            task.startTime = null;
            task.finishTime = null;
            task.isComplete = false;
            task.failed = false;
        }

        await this.entityManager.persistAndFlush(longRunningTasks);
    }

    async findPendingByType(taskType: NobleTaskType) {
        const results = await this.entityManager.find(NobleTaskEntity, {
            taskType,
            isComplete: false,
            failed: false,
            beingProcessedBy: null
        });

        return results;
    }

    async deleteTaskById(id: string) {
        const recordToDelete = await this.findOneById(id);
        if (recordToDelete) {
            await this.entityManager.remove(recordToDelete);
        }

        return recordToDelete;
    }

    async getTrackedTasksByTypes(pagination: Pagination, types: NobleTaskType[] | undefined, searchTypes: NobleTaskStatus[] | undefined) {
        const actualSearchTypes = searchTypes ?? [NobleTaskStatus.All];
        const includePending =
          _.includes(actualSearchTypes, NobleTaskStatus.All) ||
          _.includes(actualSearchTypes, NobleTaskStatus.Pending);
        const includeInProgress =
          _.includes(actualSearchTypes, NobleTaskStatus.All) ||
          _.includes(actualSearchTypes, NobleTaskStatus.InProgress);
        const includeComplete =
          _.includes(actualSearchTypes, NobleTaskStatus.All) ||
          _.includes(actualSearchTypes, NobleTaskStatus.Complete);
        const includeFailed =
          _.includes(actualSearchTypes, NobleTaskStatus.All) || _.includes(actualSearchTypes, NobleTaskStatus.Failed);

        const query = this.entityManager.createQueryBuilder(NobleTaskEntity, 'tt')
          .select("*")
          .where({
              ...(types && {taskType: {$in: types ?? []}}),
          }).andWhere(
            _.filter(
              [
                  { ...(includeComplete && { isComplete: true }) },
                  { ...(includeFailed && { failed: true }) },
                  { ...(includeInProgress && { beingProcessedBy: { $ne: null } }) },
                  {
                      ...(includePending && {
                          beingProcessedBy: { $eq: null },
                          isComplete: false,
                          failed: false,
                      }),
                  },
              ],
              (obj) => Object.keys(obj).length > 0,
            ),
          ).orderBy({
              'tt.finish_time': 'DESC NULLS LAST',
              'tt.updated_at': 'DESC',
              'tt.start_time': 'ASC NULLS LAST',
              'tt.priority': 'DESC',
          })
          .limit(pagination?.limit)
          .offset(pagination?.offset)

        return await query.getResultAndCount();

    }

    getExisingPendingJobForOrganisationIdByType(orgId: string, type: NobleTaskType) {
        return this.entityManager.findOne(NobleTaskEntity, {
            organisationId: orgId,
            beingProcessedBy: {$eq: null},
            taskType: type,
            failed: false,
            isComplete: false
        });
    }
}

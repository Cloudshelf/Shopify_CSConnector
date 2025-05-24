import { FlushMode } from '@mikro-orm/core';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { NotificationUtils } from '../../utils/NotificationUtils';
import { SlackUtils } from '../../utils/SlackUtils';
import { ReportSyncIssuesQueue } from '../queues';
import { getDbForTrigger } from '../reuseables/db';
import { logger, schedules } from '@trigger.dev/sdk';

export const ReportSyncIssues = schedules.task({
    id: 'report-sync-issues',
    cron: {
        pattern: '0 6 * * *',
        timezone: 'Europe/London',
    },
    machine: {
        preset: 'small-1x',
    },
    queue: ReportSyncIssuesQueue,
    run: async () => {
        const AppDataSource = getDbForTrigger();
        if (!AppDataSource) {
            logger.error(`AppDataSource is not set`);
            throw new Error(`AppDataSource is not set`);
        }

        const slackToken = process.env.SLACK_TOKEN;
        if (!slackToken) {
            logger.error(`SLACK_TOKEN is not set`);
            throw new Error(`SLACK_TOKEN is not set`);
        }

        const slackHealthChannel = process.env.SLACK_HEALTH_NOTIFICATION_CHANNEL;
        if (!slackHealthChannel) {
            logger.error(`SLACK_HEALTH_NOTIFICATION_CHANNEL is not set`);
            throw new Error(`SLACK_HEALTH_NOTIFICATION_CHANNEL is not set`);
        }

        const em = AppDataSource.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        const retailers = await em.find(RetailerEntity, {
            $or: [
                {
                    lastSafetySyncCompleted: {
                        $lt: new Date(Date.now() - 48 * 60 * 60 * 1000),
                    },
                },
                {
                    lastSafetySyncCompleted: {
                        $eq: null,
                    },
                },
            ],
            syncErrorCode: { $eq: null },
        });

        const data = retailers.map(r => {
            return { displayName: r.displayName ?? r.domain, url: r.domain };
        });

        if (data.length > 0) {
            await SlackUtils.SendNotification(
                slackToken,
                slackHealthChannel,
                NotificationUtils.buildSyncIssueNotifications(data),
            );
        }
    },
});

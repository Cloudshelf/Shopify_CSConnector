import { FlushMode } from '@mikro-orm/core';
import { AppDataSource } from '../reuseables/orm';
import { logger, schedules } from '@trigger.dev/sdk/v3';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { NotificationUtils } from 'src/utils/NotificationUtils';
import { SlackUtils } from 'src/utils/SlackUtils';

export const ReportSyncIssues = schedules.task({
    id: 'report-sync-issues',
    cron: {
        pattern: '0 6 * * *',
        timezone: 'Europe/London',
    },
    machine: {
        preset: 'small-1x',
    },
    queue: {
        concurrencyLimit: 1,
    },
    run: async () => {
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

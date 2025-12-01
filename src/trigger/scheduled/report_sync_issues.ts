import { schedules } from '@trigger.dev/sdk';
import { RetailerStatus } from 'src/modules/retailer/retailer.status.enum';
import { RetailerEntity } from '../../modules/retailer/retailer.entity';
import { NotificationUtils } from '../../utils/NotificationUtils';
import { SlackUtils } from '../../utils/SlackUtils';
import { ReportSyncIssuesQueue } from '../queues';
import { getDbForTrigger, getEnvConfig } from '../reuseables/initialization';

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
        return; //DISABLE FOR NOW, as I dont think we need or want this anymore.
        const env = getEnvConfig();
        const AppDataSource = getDbForTrigger();

        const retailers = await AppDataSource.find(RetailerEntity, {
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
            status: RetailerStatus.ACTIVE,
        });

        const data = retailers.map(r => {
            return { displayName: r.displayName ?? r.domain, url: r.domain };
        });

        if (data.length > 0) {
            await SlackUtils.SendNotification(
                env.SLACK_TOKEN,
                env.SLACK_HEALTH_NOTIFICATION_CHANNEL,
                NotificationUtils.buildSyncIssueNotifications(data),
            );
        }
    },
});

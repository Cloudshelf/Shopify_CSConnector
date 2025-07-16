import { Injectable } from '@nestjs/common';
import { runs } from '@trigger.dev/sdk/v3';
import { ExtendedLogger } from 'src/utils/ExtendedLogger';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

@Injectable()
export class TriggerHandlersService {
    private readonly logger = new ExtendedLogger('TriggerHandlersService');

    async cancelTriggersForDomain({ domain, retailerId }: { domain: string; retailerId?: string }) {
        const searchTags = TriggerTagsUtils.createTags({ domain, retailerId });
        this.logger.debug(`Cancelling triggers for domain ${domain} with tags ${searchTags}`);

        for await (const run of runs.list({
            status: [
                'WAITING_FOR_DEPLOY',
                'DELAYED',
                'EXECUTING',
                'FROZEN',
                'INTERRUPTED',
                'QUEUED',
                'REATTEMPTING',
                'PENDING_VERSION',
            ],
            tag: searchTags,
        })) {
            try {
                this.logger.debug(`Cancelling trigger ${run.id} for domain ${domain}`);
                await runs.cancel(run.id);
            } catch (error) {
                this.logger.error(`Error cancelling trigger ${run.id} for domain ${domain}`, error);
            }
        }
    }
}

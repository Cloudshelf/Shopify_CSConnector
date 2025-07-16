import { Injectable } from '@nestjs/common';
import { runs } from '@trigger.dev/sdk/v3';
import { ExtendedLogger } from 'src/utils/ExtendedLogger';
import { TriggerTagsUtils } from 'src/utils/TriggerTagsUtils';

@Injectable()
export class TriggerHandlersService {
    private readonly logger = new ExtendedLogger('TriggerHandlersService');

    async cancelTriggersForDomain({ domain, retailerId }: { domain: string; retailerId?: string }) {
        const searchTags = TriggerTagsUtils.createTags({ domain, retailerId });

        for await (const run of runs.list({
            tag: searchTags,
        })) {
            this.logger.debug(`Cancelling trigger ${run.id} for domain ${domain}`);
            await runs.cancel(run.id);
        }
    }
}

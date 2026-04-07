import {
    GetEffectiveTaskConfigDocument,
    GetEffectiveTaskConfigQuery,
    GetEffectiveTaskConfigQueryVariables,
} from '../graphql/cloudshelf/generated/cloudshelf';
import { logger } from '@trigger.dev/sdk';
import { CloudshelfApiAuthUtils } from '../modules/cloudshelf/cloudshelf.api.auth.util';
import { resolveApiUrl } from './resolve-api-url';
import type { MachineSize } from './reuseables/machines_size';

const VALID_MACHINE_SIZES: ReadonlySet<string> = new Set([
    'micro',
    'small-1x',
    'small-2x',
    'medium-1x',
    'medium-2x',
    'large-1x',
    'large-2x',
]);

function isValidMachineSize(value: string): value is MachineSize {
    return VALID_MACHINE_SIZES.has(value);
}

export interface TaskConfigOverrides {
    machine?: MachineSize;
    maxDuration?: number;
}

/**
 * Fetches the effective task configuration from the cloudshelf API.
 * Returns the overrides to pass to trigger, or null if the API returns nulls
 * or if the request fails (graceful degradation).
 */
export async function fetchEffectiveTaskConfig(domain: string, taskId: string): Promise<TaskConfigOverrides | null> {
    try {
        const apiUrl = resolveApiUrl();
        if (!apiUrl) return null;
        const client = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain);
        const { data } = await client.query<GetEffectiveTaskConfigQuery, GetEffectiveTaskConfigQueryVariables>({
            query: GetEffectiveTaskConfigDocument,
            variables: { taskId },
            fetchPolicy: 'no-cache',
        });

        const config = data?.effectiveTaskConfig;
        if (!config || (config.machineSize == null && config.maxDuration == null)) {
            return null;
        }

        const result: TaskConfigOverrides = {};
        if (config.machineSize != null && isValidMachineSize(config.machineSize)) {
            result.machine = config.machineSize;
        }
        if (config.maxDuration != null && Number.isFinite(config.maxDuration) && config.maxDuration > 0) {
            result.maxDuration = config.maxDuration;
        }

        if (result.machine == null && result.maxDuration == null) {
            return null;
        }

        return result;
    } catch (error) {
        logger.warn('[TaskConfig] Failed to fetch effective task config, using task defaults', {
            domain,
            taskId,
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}

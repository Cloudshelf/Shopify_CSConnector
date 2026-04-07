import {
    GetEffectiveTaskConfigDocument,
    GetEffectiveTaskConfigQuery,
    GetEffectiveTaskConfigQueryVariables,
} from '../graphql/cloudshelf/generated/cloudshelf';
import { logger } from '@trigger.dev/sdk';
import { CloudshelfApiAuthUtils } from '../modules/cloudshelf/cloudshelf.api.auth.util';
import { getEnvConfig } from './reuseables/initialization';
import type { MachineSize } from './reuseables/machines_size';

export interface TaskConfigOverrides {
    machine: MachineSize;
    maxDuration: number;
}

/**
 * Fetches the effective task configuration from the cloudshelf API.
 * Returns the overrides to pass to trigger, or null if the API returns nulls
 * or if the request fails (graceful degradation).
 */
export async function fetchEffectiveTaskConfig(domain: string, taskId: string): Promise<TaskConfigOverrides | null> {
    try {
        const env = getEnvConfig();
        const client = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(env.CLOUDSHELF_API_URL, domain);
        const { data } = await client.query<GetEffectiveTaskConfigQuery, GetEffectiveTaskConfigQueryVariables>({
            query: GetEffectiveTaskConfigDocument,
            variables: { taskId },
            fetchPolicy: 'no-cache',
        });

        const config = data?.effectiveTaskConfig;
        if (!config || (config.machineSize == null && config.maxDuration == null)) {
            return null;
        }

        const result: TaskConfigOverrides = {} as TaskConfigOverrides;
        if (config.machineSize != null) {
            result.machine = config.machineSize as MachineSize;
        }
        if (config.maxDuration != null) {
            result.maxDuration = config.maxDuration;
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

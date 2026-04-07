import {
    ReportTriggerJobPendingDocument,
    ReportTriggerJobPendingMutation,
    ReportTriggerJobPendingMutationVariables,
} from '../graphql/cloudshelf/generated/cloudshelf';
import { logger } from '@trigger.dev/sdk';
import { CloudshelfApiAuthUtils } from '../modules/cloudshelf/cloudshelf.api.auth.util';
import { resolveApiUrl } from './resolve-api-url';

/**
 * Reports a pending job to the cloudshelf API via GraphQL.
 * Called after triggering a task to record the pending state.
 */
export async function reportPendingToApi(
    domain: string,
    taskId: string,
    runId: string,
    debounceDelayMs?: number,
    debounceMaxDelayMs?: number,
): Promise<void> {
    try {
        const apiUrl = resolveApiUrl();
        if (!apiUrl) return;
        const client = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain);
        await client.mutate<ReportTriggerJobPendingMutation, ReportTriggerJobPendingMutationVariables>({
            mutation: ReportTriggerJobPendingDocument,
            variables: {
                taskId,
                runId,
                debounceDelayMs: debounceDelayMs ?? 0,
                debounceMaxDelayMs: debounceMaxDelayMs ?? 0,
            },
        });
    } catch (error) {
        logger.warn('[JobTracking] Failed to report pending job', {
            domain,
            taskId,
            runId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

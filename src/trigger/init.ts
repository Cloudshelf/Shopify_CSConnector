import { logger, tasks, usage } from '@trigger.dev/sdk';
import './reuseables/initialization';
import {
    ReportTriggerJobCompletedDocument,
    ReportTriggerJobCompletedMutation,
    ReportTriggerJobCompletedMutationVariables,
    ReportTriggerJobFailedDocument,
    ReportTriggerJobFailedMutation,
    ReportTriggerJobFailedMutationVariables,
    ReportTriggerJobStartedDocument,
    ReportTriggerJobStartedMutation,
    ReportTriggerJobStartedMutationVariables,
} from '../graphql/cloudshelf/generated/cloudshelf';
import { CloudshelfApiAuthUtils } from '../modules/cloudshelf/cloudshelf.api.auth.util';
import { RetailerEntity } from '../modules/retailer/retailer.entity';
import { getDbForTrigger, getEnvConfig } from './reuseables/initialization';

async function getRetailerDomain(payload: unknown): Promise<string | null> {
    try {
        if (!payload || typeof payload !== 'object' || !('organisationId' in payload)) {
            return null;
        }
        const orgId = (payload as Record<string, unknown>).organisationId;
        if (typeof orgId !== 'string') {
            return null;
        }
        const em = getDbForTrigger();
        const retailer = await em.findOne(RetailerEntity, { id: orgId });
        return retailer?.domain ?? null;
    } catch {
        return null;
    }
}

tasks.onStart(async ({ ctx, payload, task }) => {
    logger.info(`Starting on machine "${ctx.machine?.name ?? 'Unknown'}"`, { ctx });

    const domain = await getRetailerDomain(payload);
    if (domain) {
        try {
            const env = getEnvConfig();
            const client = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(env.CLOUDSHELF_API_URL, domain);
            await client.mutate<ReportTriggerJobStartedMutation, ReportTriggerJobStartedMutationVariables>({
                mutation: ReportTriggerJobStartedDocument,
                variables: { taskId: ctx.task.id, runId: ctx.run.id },
            });
        } catch (error) {
            logger.warn('[JobTracking] Failed to report job started', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
});

tasks.onSuccess(async ({ ctx, output, payload }) => {
    let costInDollars = 'NOT_KNOWN';

    const currentUsage = usage.getCurrent();
    if (currentUsage.totalCostInCents) {
        costInDollars = `$${(currentUsage.totalCostInCents / 100).toLocaleString('en-US', {
            minimumFractionDigits: 10,
            useGrouping: false,
        })}`;
    }

    logger.info(`[Costing] This task completed successfully, with a total cost of ${costInDollars}`);

    const domain = await getRetailerDomain(payload);
    if (domain) {
        try {
            const env = getEnvConfig();
            const durationMs = Date.now() - new Date(ctx.run.startedAt).getTime();
            const client = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(env.CLOUDSHELF_API_URL, domain);
            await client.mutate<ReportTriggerJobCompletedMutation, ReportTriggerJobCompletedMutationVariables>({
                mutation: ReportTriggerJobCompletedDocument,
                variables: { taskId: ctx.task.id, runId: ctx.run.id, durationMs },
            });
        } catch (error) {
            logger.warn('[JobTracking] Failed to report job completed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
});

tasks.onFailure(async ({ ctx, error, payload }) => {
    let costInDollars = 'NOT_KNOWN';

    const currentUsage = usage.getCurrent();
    if (currentUsage.totalCostInCents) {
        costInDollars = `$${(currentUsage.totalCostInCents / 100).toLocaleString('en-US', {
            minimumFractionDigits: 10,
            useGrouping: false,
        })}`;
    }

    logger.error(`[Costing] This task failed, with a total cost of ${costInDollars}`);

    const domain = await getRetailerDomain(payload);
    if (domain) {
        try {
            const env = getEnvConfig();
            const client = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(env.CLOUDSHELF_API_URL, domain);
            await client.mutate<ReportTriggerJobFailedMutation, ReportTriggerJobFailedMutationVariables>({
                mutation: ReportTriggerJobFailedDocument,
                variables: { taskId: ctx.task.id, runId: ctx.run.id },
            });
        } catch (error) {
            logger.warn('[JobTracking] Failed to report job failed', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
});

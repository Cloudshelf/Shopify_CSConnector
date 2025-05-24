import { logger, tasks, usage } from '@trigger.dev/sdk';

tasks.onStart(async ({ ctx, payload, task }) => {
    console.log('onstart');
    logger.info(`Starting on machine "${ctx.machine?.name ?? 'Unknown'}"`, { ctx });
});

tasks.onSuccess(({ ctx, output }) => {
    let costInDollars = 'NOT_KNOWN';

    const currentUsage = usage.getCurrent();
    if (currentUsage.totalCostInCents) {
        costInDollars = `$${(currentUsage.totalCostInCents / 100).toLocaleString('en-US', {
            minimumFractionDigits: 10,
            useGrouping: false,
        })}`;
    }

    logger.info(`[Costing] This task completed successfully, with a total cost of ${costInDollars}`);
});

tasks.onFailure(({ ctx, error }) => {
    let costInDollars = 'NOT_KNOWN';

    const currentUsage = usage.getCurrent();
    if (currentUsage.totalCostInCents) {
        costInDollars = `$${(currentUsage.totalCostInCents / 100).toLocaleString('en-US', {
            minimumFractionDigits: 10,
            useGrouping: false,
        })}`;
    }

    logger.error(`[Costing] This task failed, with a total cost of ${costInDollars}`);
});

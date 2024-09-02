import { StartMikroORMForTrigger } from './src/trigger/reuseables/orm';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { additionalPackages } from '@trigger.dev/build/extensions/core';
import { emitDecoratorMetadata } from '@trigger.dev/build/extensions/typescript';
import { defineConfig, logger, usage } from '@trigger.dev/sdk/v3';

export default defineConfig({
    project: 'proj_pnqbfgxmeuaytlevhxap',
    build: {
        external: [
            '@sentry/profiling-node',
            '@as-integrations/fastify',
            '@nestjs/apollo',
            '@nestjs/terminus',
            'fsevents',
            '@nestjs/config',
        ],
        extensions: [emitDecoratorMetadata(), additionalPackages({ packages: [] })],
    },
    logLevel: 'log',
    retries: {
        enabledInDev: true,
        default: {
            maxAttempts: 3,
            minTimeoutInMs: 1000,
            maxTimeoutInMs: 10000,
            factor: 2,
            randomize: true,
        },
    },
    instrumentations: [
        new PgInstrumentation(),
        new UndiciInstrumentation(),
        new HttpInstrumentation(),
        new FsInstrumentation(),
    ],
    init: async (payload, { ctx }) => {
        logger.info(`Initialized on machine "${ctx.machine?.name ?? 'Unknown'}"`, { ctx });
        await StartMikroORMForTrigger();
    },
    onSuccess: async (payload, output, params) => {
        let costInDollars = 'NOT_KNOWN';

        const currentUsage = usage.getCurrent();
        if (currentUsage.totalCostInCents) {
            costInDollars = `$${(currentUsage.totalCostInCents / 100).toLocaleString('en-US', {
                minimumFractionDigits: 10,
                useGrouping: false,
            })}`;
        }

        logger.info(`[Costing] This task completed successfully, with a total cost of ${costInDollars}`);
    },
    onFailure: async (payload, error, params) => {
        let costInDollars = 'NOT_KNOWN';

        const currentUsage = usage.getCurrent();
        if (currentUsage.totalCostInCents) {
            costInDollars = `$${(currentUsage.totalCostInCents / 100).toLocaleString('en-US', {
                minimumFractionDigits: 10,
                useGrouping: false,
            })}`;
        }

        logger.error(`[Costing] This task failed, with a total cost of ${costInDollars}`);
    },
});

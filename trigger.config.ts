import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { emitDecoratorMetadata } from '@trigger.dev/build/extensions/typescript';
import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
    project: 'proj_pnqbfgxmeuaytlevhxap',
    maxDuration: 1800, // 30 mins
    build: {
        external: [
            '@as-integrations/fastify',
            '@apollo/gateway',
            '@nestjs/mongoose',
            '@nestjs/sequelize',
            '@sentry/profiling-node',
            '@nestjs/apollo',
            '@nestjs/terminus',
            'fsevents',
        ],

        extensions: [emitDecoratorMetadata()],
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
});

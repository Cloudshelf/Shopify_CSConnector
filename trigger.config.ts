import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
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
    telemetry: {
        instrumentations: [new NestInstrumentation()],
        logExporters: [
            new OTLPLogExporter({
                url: 'https://api.axiom.co/v1/traces',
                headers: {
                    Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
                    'X-Axiom-Dataset': process.env.AXIOM_DATASET || '',
                },
            }),
        ],
        exporters: [
            new OTLPTraceExporter({
                url: 'https://api.axiom.co/v1/traces',
                headers: {
                    Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
                    'X-Axiom-Dataset': process.env.AXIOM_DATASET || '',
                },
                keepAlive: true,
            }),
        ],
    },
});

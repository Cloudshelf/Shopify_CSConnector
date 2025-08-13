import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { FsInstrumentation } from '@opentelemetry/instrumentation-fs';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { emitDecoratorMetadata } from '@trigger.dev/build/extensions/typescript';
import { defineConfig } from '@trigger.dev/sdk';

// Paths to ignore in filesystem instrumentation
// Use exact paths or patterns with wildcards (*)
const FS_PATHS_TO_IGNORE = [
    '/app/*', //  Wildcard: matches any file in /app/*
    '.env', // Exact match
    '/tmp/*', // Wildcard: matches any file in /tmp/
    '*/node_modules/*', // Wildcard: matches any path containing node_modules
    'node:internal/*',
    '/home/node/.aws/*',
];

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
        new FsInstrumentation({
            createHook: (functionName, info) => {
                const path = info.args[0];
                if (typeof path === 'string') {
                    // Skip tracing for paths in the ignore list
                    const shouldIgnore = FS_PATHS_TO_IGNORE.some(pattern => {
                        // Convert wildcard pattern to regex
                        if (pattern.includes('*')) {
                            // Escape special regex characters except *
                            const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                            const regex = new RegExp(`^${regexPattern}$`);
                            return regex.test(path);
                        }
                        // Exact match for patterns without wildcards
                        return path === pattern;
                    });

                    if (shouldIgnore) {
                        return false;
                    }
                }
                return true;
            },
            endHook: (functionName, info) => {
                const { span, args } = info;
                // Add the file path as an attribute if available
                const path = args[0];
                if (path && typeof path === 'string') {
                    span.setAttribute('fs.path', path);
                    span.setAttribute('fs.operation', functionName);
                }
            },
            // Only trace fs operations if there's a parent span
            requireParentSpan: true,
        }),
    ],
    telemetry: {
        instrumentations: [new NestInstrumentation()],
        logExporters: [
            new OTLPLogExporter({
                url: 'https://api.axiom.co/v1/logs',
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

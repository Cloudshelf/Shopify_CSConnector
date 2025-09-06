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

// Pre-compile patterns for efficient matching
const exactPaths = new Set<string>();
const regexPatterns: RegExp[] = [];

// Initialize pattern matchers at module load time
FS_PATHS_TO_IGNORE.forEach(pattern => {
    if (pattern.includes('*')) {
        // Convert wildcard pattern to regex once
        const regexPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
        regexPatterns.push(new RegExp(`^${regexPattern}$`));
    } else {
        // Store exact matches in Set for O(1) lookup
        exactPaths.add(pattern);
    }
});

// Centralized path matching function
function shouldIgnorePath(path: unknown): boolean {
    // Handle non-string arguments
    if (typeof path !== 'string') {
        return false;
    }

    // Check exact matches first (O(1))
    if (exactPaths.has(path)) {
        return true;
    }

    // Check regex patterns
    return regexPatterns.some(regex => regex.test(path));
}

export default defineConfig({
    project: 'proj_pnqbfgxmeuaytlevhxap',
    maxDuration: 1800, // 30 mins
    build: {
        external: [
            '@as-integrations/fastify',
            '@apollo/gateway',
            '@nestjs/mongoose',
            '@nestjs/sequelize',
            '@nestjs/apollo',
            '@nestjs/terminus',
            'fsevents',
            'mariadb',
            'mariadb/callback',
            'better-sqlite3',
            'libsql',
            'tedious',
            'mysql',
            'mysql2',
            'oracledb',
            'pg-query-stream',
            'sqlite3',
            '@mikro-orm/knex',
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
            createHook: (_functionName, info) => {
                // Use centralized matching logic
                return !shouldIgnorePath(info.args[0]);
            },
            endHook: (functionName, info) => {
                const { span, args } = info;
                // Add the file path as an attribute if available (handle non-string args)
                const path = args[0];
                if (typeof path === 'string') {
                    span.setAttribute('fs.path', path);
                    span.setAttribute('fs.operation', functionName);
                }
            },
            // Only trace fs operations if there's a parent span
            requireParentSpan: true,
        }),
        new NestInstrumentation(),
    ],
    // telemetry: {
    //     logExporters: [
    //         new OTLPLogExporter({
    //             url: 'https://api.axiom.co/v1/logs',
    //             headers: {
    //                 Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
    //                 'X-Axiom-Dataset': process.env.AXIOM_DATASET || '',
    //             },
    //         }),
    //     ],
    //     exporters: [
    //         new OTLPTraceExporter({
    //             url: 'https://api.axiom.co/v1/traces',
    //             headers: {
    //                 Authorization: `Bearer ${process.env.AXIOM_TOKEN}`,
    //                 'X-Axiom-Dataset': process.env.AXIOM_DATASET || '',
    //             },
    //             keepAlive: true,
    //         }),
    //     ],
    // },
});

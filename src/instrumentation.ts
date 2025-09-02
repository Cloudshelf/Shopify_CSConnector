import { CrawlerErrorSampler } from './crawler-error-sampler';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';
import * as process from 'process';

const traceExporter = new OTLPTraceExporter({
    url: 'https://api.axiom.co/v1/traces',
    headers: {
        Authorization: `Bearer ${process.env.AXIOM_TOKEN || ''}`,
        'X-Axiom-Dataset': process.env.AXIOM_DATASET || '',
    },
});

const resource = resourceFromAttributes({
    ['service.name']: 'Shopify_Connector',
    ['service.version']: process.env.PACKAGE_VERSION || 'unknown',
});

// Paths that are excluded from proxy (these are actual API endpoints)
const EXCLUDED_PROXY_PATHS = [
    /^\/shopify\/.*/,
    /^\/graphql/,
    /^\/api-health.*/,
    /^\/stock-levels/,
    /^\/pos/,
];

function isProxyRequest(url: string | undefined): boolean {
    if (!url) return false;
    // Extract the path from the URL
    const path = url.split('?')[0];
    // Check if the path matches any excluded patterns
    return !EXCLUDED_PROXY_PATHS.some(pattern => pattern.test(path));
}

// Custom HTTP instrumentation to handle proxy 404s
const customHttpInstrumentation = new HttpInstrumentation({
    applyCustomAttributesOnSpan: (span, request, response) => {
        // Only process server spans (incoming requests)
        if (response && 'statusCode' in response) {
            const url = (request as any).url || (request as any).path;
            const statusCode = (response as any).statusCode;
            
            // If this is a proxy request returning 404, don't mark as error
            if (isProxyRequest(url) && statusCode === 404) {
                span.setStatus({ code: SpanStatusCode.UNSET });
            }
        }
    },
});

const otelSDK = new NodeSDK({
    metricReader: undefined, //not yet supported by axiom, we could use something like prometheus
    spanProcessors: [new BatchSpanProcessor(traceExporter)],
    contextManager: new AsyncLocalStorageContextManager(),
    textMapPropagator: new CompositePropagator({
        propagators: [
            new W3CTraceContextPropagator(),
            new W3CBaggagePropagator(),
            new B3Propagator(),
            new B3Propagator({
                injectEncoding: B3InjectEncoding.MULTI_HEADER,
            }),
        ],
    }),
    instrumentations: [
        getNodeAutoInstrumentations({
            // Disable default HTTP instrumentation as we're using custom one
            '@opentelemetry/instrumentation-http': {
                enabled: false,
            },
        }),
        customHttpInstrumentation,
    ],
    resource,
    sampler: new CrawlerErrorSampler(new TraceIdRatioBasedSampler(1.0)),
});

export default otelSDK;

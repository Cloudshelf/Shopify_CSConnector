import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as process from 'process';

const traceExporter = new OTLPTraceExporter({
    url: 'https://api.axiom.co/v1/traces',
    headers: {
        Authorization: `Bearer ${process.env.AXIOM_TOKEN || ''}`,
        'X-Axiom-Dataset': process.env.AXIOM_DATASET || '',
    },
});

const resource = new Resource({
    ['service.name']: 'Shopify_Connector',
    ['service.version']: process.env.PACKAGE_VERSION || 'unknown',
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
    instrumentations: [getNodeAutoInstrumentations()],
    resource,
});

export default otelSDK;

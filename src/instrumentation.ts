// Importing necessary OpenTelemetry packages including the core SDK, auto-instrumentations, OTLP trace exporter, and batch span processor
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Initialize OTLP trace exporter with the endpoint URL and headers
const traceExporter = new OTLPTraceExporter({
    url: 'https://api.axiom.co/v1/traces',
    headers: {
        Authorization: 'Bearer ', //todo: add token from env
        'X-Axiom-Dataset': 'cloudshelf',
    },
});

// Creating a resource to identify your service in traces
const resource = new Resource({
    [ATTR_SERVICE_NAME]: 'Connector_Shopify',
});

// Configuring the OpenTelemetry Node SDK
const sdk = new NodeSDK({
    // Adding a BatchSpanProcessor to batch and send traces
    spanProcessor: new BatchSpanProcessor(traceExporter),
    // logRecordProcessor: new logs.SimpleLogRecordProcessor(new logs.ConsoleLogRecordExporter()),

    // Registering the resource to the SDK
    resource: resource,

    // Adding auto-instrumentations to automatically collect trace data
    instrumentations: [getNodeAutoInstrumentations()],
});

// Starting the OpenTelemetry SDK to begin collecting telemetry data
sdk.start();

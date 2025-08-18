import { SpanKind, trace } from '@opentelemetry/api';

export class TelemetryUtil {
    static InformationalTransaction(
        op: string,
        name: string,
        data: any,
        scopeUser?: { id?: string; username?: string },
    ) {
        const tracer = trace.getTracer('default');

        tracer.startActiveSpan(
            name,
            {
                kind: SpanKind.INTERNAL,
                attributes: {
                    'operation.type': op,
                    'operation.name': name,
                    ...(scopeUser?.id && { 'user.id': scopeUser.id }),
                    ...(scopeUser?.username && { 'user.username': scopeUser.username }),
                },
            },
            span => {
                // Add data as span attributes
                if (data && typeof data === 'object') {
                    Object.entries(data).forEach(([key, value]) => {
                        if (value !== undefined && value !== null) {
                            // Convert complex objects to JSON strings
                            const attributeValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                            span.setAttribute(`data.${key}`, attributeValue);
                        }
                    });
                }

                span.end();
            },
        );
    }
}

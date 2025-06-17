import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    SetMetadata,
    UseInterceptors,
    applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Span as OtelApiSpan, SpanAttributes, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { copyMetadataFromFunctionToFunction } from 'nestjs-otel/lib/opentelemetry.utils';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface TelemetryOptions {
    /**
     * Whether to include GraphQL details in the span.
     * When true, adds GraphQL operation type, name, and document as span attributes.
     * @default false
     */
    isGraphQL?: boolean;
    /**
     * The SpanKind of a span
     * @default {@link SpanKind.INTERNAL}
     */
    kind?: SpanKind;
    /** A span's attributes */
    attributes?: SpanAttributes;
    /** The new span should be a root span. (Ignore parent from context). */
    root?: boolean;
}

export interface TelemetryInterceptData extends TelemetryOptions {
    spanName: string;
}

const recordException = (span: OtelApiSpan, error: any) => {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
};

@Injectable()
export class GraphqlSpanInterceptor implements NestInterceptor {
    constructor(private reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const instrumentData = this.reflector.get<TelemetryInterceptData>(
            'telemetryInterceptData',
            context.getHandler(),
        );

        const ctx = GqlExecutionContext.create(context);
        const info = ctx.getInfo();

        const tracer = trace.getTracer('default');
        const spanName = instrumentData.spanName;

        return tracer.startActiveSpan(spanName, span => {
            if (info.operation) {
                span.setAttribute('graphql.operation.type', info.operation.operation);
                span.setAttribute('graphql.operation.name', info.operation.name?.value || 'anonymous');

                if (info.operation.loc && info.operation.loc.source) {
                    const query = info.operation.loc.source.body;
                    if (query) {
                        span.setAttribute('graphql.operation.document', query);
                    }
                }

                const variablesWithValues: Record<string, unknown> = {};
                if (info.operation.variableDefinitions) {
                    const variableDefinitions = info.operation.variableDefinitions;
                    if (variableDefinitions && variableDefinitions.length > 0) {
                        // Get the actual variable values from the context
                        const args = ctx.getArgs();

                        variableDefinitions.forEach((def: any) => {
                            const name = def.variable.name.value;
                            if (args && name in args) {
                                variablesWithValues[name] = args[name];
                            }
                        });
                    }
                }
                span.setAttribute('graphql.operation.variables', JSON.stringify(variablesWithValues));
            }

            return next.handle().pipe(
                tap({
                    next: () => {
                        span.end();
                    },
                    error: error => {
                        recordException(span, error);
                        span.end();
                    },
                }),
            );
        });
    }
}

function BasicOtelSpan(telemetryInterceptData: TelemetryInterceptData) {
    return (target: any, propertyKey: PropertyKey, propertyDescriptor: PropertyDescriptor) => {
        const originalFunction = propertyDescriptor.value;
        const wrappedFunction = function PropertyDescriptor(...args: any[]) {
            const tracer = trace.getTracer('default');

            return tracer.startActiveSpan(
                telemetryInterceptData.spanName,
                {
                    kind: telemetryInterceptData.kind,
                    attributes: telemetryInterceptData.attributes,
                    root: telemetryInterceptData.root,
                },
                span => {
                    if (originalFunction.constructor.name === 'AsyncFunction') {
                        return originalFunction
                            .apply(this, args)
                            .catch((error: Error) => {
                                recordException(span, error);
                                // Throw error to propagate it further
                                throw error;
                            })
                            .finally(() => {
                                span.end();
                            });
                    }

                    try {
                        return originalFunction.apply(this, args);
                    } catch (error) {
                        recordException(span, error);
                        // Throw error to propagate it further
                        throw error;
                    } finally {
                        span.end();
                    }
                },
            );
        };

        propertyDescriptor.value = wrappedFunction;

        copyMetadataFromFunctionToFunction(originalFunction, wrappedFunction);
    };
}

/**
 * Telemetry decorator for instrumenting functions and GraphQL resolvers.
 *
 * This decorator creates spans in OpenTelemetry to track execution time and record errors.
 *
 * Usage examples:
 *
 * Regular functions:
 * @Telemetry('function.myFunction')
 * async myFunction() {
 *   // function implementation
 * }
 *
 * GraphQL resolvers:
 * @Telemetry('graphql.query.myQuery', { isGraphQL: true })
 * @Query(() => MyReturnType)
 * async myQuery() {
 *   // resolver implementation
 * }
 *
 * Important notes:
 * 1. When used with authentication decorators, place Telemetry AFTER authentication:
 *    @AuthenticatedGraphqlRequest()
 *    @Telemetry('graphql.query.authenticatedQuery', { isGraphQL: true })
 *    @Query(() => MyReturnType)
 *    async authenticatedQuery() {
 *      // implementation
 *    }
 *
 * 2. For GraphQL resolvers, set isGraphQL: true to capture GraphQL context
 * 3. Custom attributes can be added via the options parameter
 * 4. Root spans can be created by setting root: true
 */
export function Telemetry(
    spanName: string,
    options?: {
        isGraphQL?: boolean;
        /**
         * The SpanKind of a span
         * @default {@link SpanKind.INTERNAL}
         */
        kind?: SpanKind;
        /** A span's attributes */
        attributes?: SpanAttributes;
        /** The new span should be a root span. (Ignore parent from context). */
        root?: boolean;
    },
) {
    const telemetryInterceptData: TelemetryInterceptData = {
        spanName,
        isGraphQL: options?.isGraphQL,
        kind: options?.kind,
        attributes: options?.attributes,
        root: options?.root,
    };

    if (telemetryInterceptData.isGraphQL) {
        return applyDecorators(
            SetMetadata('telemetryInterceptData', telemetryInterceptData),
            UseInterceptors(GraphqlSpanInterceptor),
        );
    } else {
        return BasicOtelSpan(telemetryInterceptData);
    }
}

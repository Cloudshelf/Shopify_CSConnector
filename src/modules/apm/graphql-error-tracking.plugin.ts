import { Plugin } from '@nestjs/apollo';
import { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLFormattedError } from 'graphql';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { ExtendedLogger } from '../../utils/ExtendedLogger';

@Plugin()
export class ErrorTrackingPlugin implements ApolloServerPlugin {
    private readonly logger = new ExtendedLogger('ErrorTrackingPlugin');

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        return {
            willSendResponse: async requestContext => {
                // Check if there are any errors in the response
                if (
                    requestContext.response?.body?.kind === 'single' &&
                    requestContext.response.body.singleResult.errors
                ) {
                    const errors: readonly GraphQLFormattedError[] = requestContext.response.body.singleResult.errors;

                    // Filter for only internal server errors (not user/validation errors)
                    const internalErrors = errors.filter(error => {
                        // Safely check if extensions exists and code is INTERNAL_SERVER_ERROR
                        return error.extensions?.code === 'INTERNAL_SERVER_ERROR';
                    });

                    if (internalErrors.length === 0) {
                        return; // No internal errors to track
                    }

                    const tracer = trace.getTracer('default');
                    const activeSpan = trace.getActiveSpan();

                    if (activeSpan) {
                        // Record each internal error as an exception in the current span
                        internalErrors.forEach(error => {
                            try {
                                // Safely extract error code with fallback
                                const errorCode =
                                    typeof error.extensions?.code === 'string' ? error.extensions.code : 'GraphQLError';

                                // Safely handle stacktrace
                                let stack: string | undefined;
                                if (error.extensions?.stacktrace) {
                                    if (Array.isArray(error.extensions.stacktrace)) {
                                        stack = error.extensions.stacktrace
                                            .filter(line => typeof line === 'string')
                                            .join('\n');
                                    } else if (typeof error.extensions.stacktrace === 'string') {
                                        stack = error.extensions.stacktrace;
                                    }
                                }

                                activeSpan.recordException({
                                    name: errorCode,
                                    message: error.message,
                                    stack: stack,
                                });

                                // Log the error with context
                                this.logger.error('GraphQL execution error', {
                                    message: error.message,
                                    path: error.path,
                                    extensions: error.extensions,
                                    operationName: requestContext.request.operationName,
                                    query: requestContext.request.query,
                                });
                            } catch (err) {
                                // Fallback error handling if something unexpected happens
                                this.logger.error('Failed to process GraphQL error', {
                                    originalError: error,
                                    processingError: err,
                                });
                            }
                        });

                        // Set the span status to ERROR
                        activeSpan.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: `GraphQL internal errors: ${internalErrors.map(e => e.message).join(', ')}`,
                        });
                    } else {
                        // If no active span, create a new one to record the error
                        tracer.startActiveSpan('graphql.error', span => {
                            internalErrors.forEach(error => {
                                try {
                                    // Safely extract error code with fallback
                                    const errorCode =
                                        typeof error.extensions?.code === 'string'
                                            ? error.extensions.code
                                            : 'GraphQLError';

                                    // Safely handle stacktrace
                                    let stack: string | undefined;
                                    if (error.extensions?.stacktrace) {
                                        if (Array.isArray(error.extensions.stacktrace)) {
                                            stack = error.extensions.stacktrace
                                                .filter(line => typeof line === 'string')
                                                .join('\n');
                                        } else if (typeof error.extensions.stacktrace === 'string') {
                                            stack = error.extensions.stacktrace;
                                        }
                                    }

                                    span.recordException({
                                        name: errorCode,
                                        message: error.message,
                                        stack: stack,
                                    });
                                } catch (err) {
                                    // Fallback if error processing fails
                                    this.logger.error('Failed to process GraphQL error in new span', {
                                        originalError: error,
                                        processingError: err,
                                    });
                                }
                            });

                            span.setStatus({
                                code: SpanStatusCode.ERROR,
                                message: `GraphQL internal errors: ${internalErrors.map(e => e.message).join(', ')}`,
                            });

                            span.end();
                        });
                    }
                }
            },
        };
    }
}

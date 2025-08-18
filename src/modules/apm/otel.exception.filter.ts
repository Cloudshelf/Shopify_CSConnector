import { ArgumentsHost, Catch, HttpServer } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { ExtendedLogger } from '../../utils/ExtendedLogger';

@Catch()
export class OtelExceptionFilter extends BaseExceptionFilter {
    readonly logger = new ExtendedLogger('OtelExceptionFilter');

    handleUnknownError(
        exception: any,
        host: ArgumentsHost,
        applicationRef: HttpServer<any, any> | AbstractHttpAdapter<any, any, any>,
    ): void {
        this.logger.debug(`In OtelExceptionFilter`);
        
        // Get the active span and record the exception
        const activeSpan = trace.getActiveSpan();
        if (activeSpan) {
            activeSpan.recordException(exception);
            activeSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: exception.message || 'Unknown error',
            });
        } else {
            // If no active span, create a new one to record the error
            const tracer = trace.getTracer('default');
            tracer.startActiveSpan('exception.handler', span => {
                span.recordException(exception);
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: exception.message || 'Unknown error',
                });
                span.end();
            });
        }

        this.logger.debug(`Exception recorded in OpenTelemetry`, JSON.stringify(exception));

        if ((host as any).contextType && (host as any).contextType === 'graphql') {
            // Do nothing as we want to see the GQL errors in the manager
            this.logger.debug(`GraphQL context - passing error through to GraphQL handler`);
        } else {
            // Do the normal error stuff, so that we return the http error codes if it was a http request
            this.logger.debug(`HTTP context - calling super`);
            return super.handleUnknownError(exception, host, applicationRef);
        }
    }
}
import { Logger } from '@nestjs/common';
import { SpanStatusCode, trace } from '@opentelemetry/api';

export class ExtendedLogger extends Logger {
    log(message: string, context?: string) {
        super.log(message, context);

        const span = trace.getActiveSpan();

        if (span) {
            span.addEvent('LogEvent', {
                logger: this.context,
                level: 'log',
                message: message,
            });

            span.setStatus({
                code: SpanStatusCode.ERROR,
            });

            span.setAttribute('Retailer', 'CSL-fashion-2');
        }
    }
}

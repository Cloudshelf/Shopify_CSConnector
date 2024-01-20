import * as Sentry from '@sentry/node';
import '@sentry/tracing';

export function SentryInstrument(className = '', argIndexToLog?: number[]) {
    return function (target: unknown, key: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            let name = `${className}.${key}`;
            if (className === '') {
                name = key;
            }

            const sentryScope = Sentry.getCurrentHub().getScope();
            const parentTransaction = sentryScope.getTransaction();
            let span: Sentry.Span | undefined = undefined;
            let thisTransaction: Sentry.Transaction | undefined = undefined;

            const argsToLog: any[] = [];
            if (argIndexToLog) {
                argIndexToLog.forEach(index => {
                    argsToLog.push(args[index]);
                });
            } else {
                args.forEach((arg, index) => {
                    argsToLog.push(arg);
                });
            }

            if (parentTransaction) {
                thisTransaction = Sentry.startTransaction({
                    op: `function`,
                    attributes: { args: argsToLog ?? {} },
                    name: name,
                    traceId: parentTransaction.traceId,
                    parentSpanId: parentTransaction.spanId,
                });
                span = parentTransaction.startChild({
                    op: `function`,
                    attributes: { args: argsToLog ?? {} },
                    name: name,
                });
            } else {
                thisTransaction = Sentry.startTransaction({
                    op: `function`,
                    attributes: { args: argsToLog ?? {} },
                    name: name,
                });
            }

            try {
                const result = await original.apply(this, args);

                if (span) {
                    span.setStatus('ok');
                }

                thisTransaction.setStatus('ok');
                return result;
            } catch (e) {
                if (span) {
                    span.setStatus('unknown_error');
                }
                thisTransaction.setStatus('unknown_error');
                throw e;
            } finally {
                if (span) {
                    span.finish();
                }
                thisTransaction.finish();
            }
        };

        return descriptor;
    };
}

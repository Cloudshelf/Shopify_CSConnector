import { Context } from '@opentelemetry/api';
import { ReadableSpan, Span, SpanProcessor } from '@opentelemetry/sdk-trace-base';

/**
 * A span processor that filters out spans based on user agent.
 * This processor simply drops spans that match the filtered user agents
 * and lets other spans pass through to the next processor in the chain.
 */
export class UserAgentFilterSpanProcessor implements SpanProcessor {
    constructor(private filteredUserAgents: string[] = []) {}

    onStart(_span: Span, _parentContext: Context): void {
        // No-op: we don't need to do anything on span start
    }

    onEnd(span: ReadableSpan): void {
        // Check if the span has a user agent attribute
        const userAgent = span.attributes['http.user_agent'] as string;

        // If user agent contains any filtered patterns, drop this span
        if (userAgent && this.filteredUserAgents.some(pattern => userAgent.includes(pattern))) {
            // Drop the span by not processing it further
            return;
        }

        // Spans that don't match will be processed by the next processor
    }

    async shutdown(): Promise<void> {
        // No-op: nothing to shut down
    }

    async forceFlush(): Promise<void> {
        // No-op: nothing to flush
    }
}

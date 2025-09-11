import { Attributes, Context, Link, SpanKind } from '@opentelemetry/api';
import { Sampler, SamplingDecision, SamplingResult } from '@opentelemetry/sdk-trace-base';

export class CrawlerErrorSampler implements Sampler {
    private crawlerPatterns = [
        /robots\d*\.txt/i,
        /\.well-known\//i,
        /favicon\.ico/i,
        /sitemap.*\.xml/i,
        /apple-touch-icon/i,
        /browserconfig\.xml/i,
    ];

    private filteredUserAgents = [
        'aikido-scan-agent', // Aikido security scanner
    ];

    constructor(private fallbackSampler: Sampler) {}

    shouldSample(
        context: Context,
        traceId: string,
        spanName: string,
        spanKind: SpanKind,
        attributes: Attributes = {},
        links: Link[] = [],
    ): SamplingResult {
        // Check for filtered user agents
        const userAgent = attributes['http.user_agent'] as string;
        if (userAgent && this.filteredUserAgents.some(pattern => userAgent.includes(pattern))) {
            return { decision: SamplingDecision.NOT_RECORD };
        }

        // Check HTTP URL patterns
        const url =
            (attributes['http.url'] as string) ??
            (attributes['http.target'] as string) ??
            (attributes['http.route'] as string) ??
            (attributes['http.path'] as string) ??
            (attributes['url.full'] as string) ??
            spanName;

        if (url && this.crawlerPatterns.some(pattern => pattern.test(url))) {
            return { decision: SamplingDecision.NOT_RECORD };
        }

        return this.fallbackSampler.shouldSample(context, traceId, spanName, spanKind, attributes, links);
    }

    toString(): string {
        return 'CrawlerErrorSampler';
    }
}

import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { SentryGqlInterceptor } from './modules/apm/sentry.graphql.interceptor';
import * as Sentry from '@sentry/node';
import { EventHint, Event as SentryEvent } from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { AppModule } from './app.module';
import { SentryFilter } from './modules/apm/sentry.exception.filter';
import * as bodyParser from 'body-parser';

async function bootstrap() {
    Error.stackTraceLimit = 100;

    //Setup Sentry
    Sentry.init({
        dsn: process.env.SENTRY_DNS,
        debug: process.env.SENTRY_DEBUG === 'true',
        tracesSampleRate: 1,
        profilesSampleRate: 1,
        environment: process.env.RELEASE_TYPE ?? 'local',
        release: process.env.PACKAGE_VERSION ?? 'local',
        ignoreErrors: [],
        integrations: [new ProfilingIntegration()],
        normalizeDepth: 5,
        maxValueLength: 1250,
        async beforeSend(event: SentryEvent, hint?: EventHint): Promise<SentryEvent | null> {
            //Do some filtering here
            return event;
        },
    });

    Sentry.startTransaction({
        op: 'Startup',
        name: 'Application Startup',
    }).finish();

    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.enableCors();
    app.enableShutdownHooks();

    app.use(bodyParser.json({ limit: '5mb' }));
    app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

    //Setup Sentry Error Filters
    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new SentryFilter(httpAdapter));
    app.useGlobalInterceptors(new SentryGqlInterceptor());

    await app.listen(process.env.PORT || 3100);
}
bootstrap();

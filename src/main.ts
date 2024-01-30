import { RawBodyRequest } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { SentryGqlInterceptor } from './modules/apm/sentry.graphql.interceptor';
import * as Sentry from '@sentry/node';
import { EventHint, Event as SentryEvent } from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { AppModule } from './app.module';
import { SentryFilter } from './modules/apm/sentry.exception.filter';
import { NoOAuthCookieExceptionFilter } from './modules/shopify/auth/no.oauth.cookie.exception.filter';
import { ExtendedLogger } from './utils/ExtendedLogger';
import { LogLevel } from '@slack/web-api';
import * as bodyParser from 'body-parser';
import { NextFunction, Request, Response, json } from 'express';
import { ulid } from 'ulid';

async function bootstrap() {
    const logger = new ExtendedLogger('Main');
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

    const app = await NestFactory.create(AppModule, {
        bodyParser: false,
        logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    app.enableCors();
    app.enableShutdownHooks();

    const orm = app.get(MikroORM);
    app.use((req: Request, res: Request, next: NextFunction) => {
        RequestContext.create(orm.em, next);
    });

    app.use((request: Request, res: Response, next: NextFunction) => {
        if (
            request.path.indexOf('/shopify/webhooks') === 0 ||
            request.path.indexOf('/shopify/required_webhooks') === 0
        ) {
            json({
                verify: (req: RawBodyRequest<Request>, _, buf) => {
                    req.rawBody = buf;
                },
            })(request, res, next);
        } else {
            json()(request, res, next);
        }
    });

    app.use(bodyParser.json({ limit: '5mb' }));
    app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

    const { httpAdapter } = app.get(HttpAdapterHost);
    app.useGlobalFilters(new SentryFilter(httpAdapter), new NoOAuthCookieExceptionFilter());
    app.useGlobalInterceptors(new SentryGqlInterceptor());

    const port = process.env.PORT || 3100;
    const host = process.env.HOST || `http://localhost:${port}`;
    await app.listen(port);

    logger.log(`🚀 Application is running on: ${host}}`);

    logger.verbose(`Start installation via shopify admin panel or by using: ${host}/offline/auth?shop=[domain]`);
    logger.verbose(`Startup ULID: ${ulid()}`);
}
bootstrap();

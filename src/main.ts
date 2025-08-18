import { INestApplication, RawBodyRequest } from '@nestjs/common';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { MikroORM, RequestContext } from '@mikro-orm/core';
import { AppModule } from './app.module';
import otelSDK from './instrumentation';
import { NoOAuthCookieExceptionFilter } from './modules/shopify/auth/no.oauth.cookie.exception.filter';
import { ExtendedLogger } from './utils/ExtendedLogger';
import * as bodyParser from 'body-parser';
import { NextFunction, Request, Response, json } from 'express';
import { ulid } from 'ulid';

export let app: INestApplication | undefined = undefined;

async function bootstrap() {
    await otelSDK.start();
    console.log('Started OTEL SDK');
    const logger = new ExtendedLogger('Main');
    Error.stackTraceLimit = 100;

    app = await NestFactory.create(AppModule, {
        bodyParser: false,
        logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    app = app!;
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
    app.useGlobalFilters(new NoOAuthCookieExceptionFilter());

    const port = process.env.PORT || 3100;
    const host = process.env.HOST || `http://localhost:${port}`;
    await app.listen(port);

    logger.log(`🚀 Application is running on: ${host}`);

    logger.verbose(`Start installation via shopify admin panel or by using: ${host}/offline/auth?shop=[domain]`);
    logger.verbose(`Startup ULID: ${ulid()}`);
}

bootstrap();

async function shutdownHandler(signal?: string) {
    console.log(`Application shutting down due to: ${signal}`);

    try {
        await otelSDK.shutdown();
        console.log('OpenTelemetry SDK shutdown completed');
    } catch (error) {
        console.error('Error during OpenTelemetry SDK shutdown', error);
    }

    process.exit(0); // Ensures clean process exit
}

// Listen for NestJS shutdown signals
process.on('SIGINT', shutdownHandler);
process.on('SIGTERM', shutdownHandler);

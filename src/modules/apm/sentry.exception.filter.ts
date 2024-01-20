import { ArgumentsHost, Catch, HttpServer } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
    handleUnknownError(
        exception: any,
        host: ArgumentsHost,
        applicationRef: HttpServer<any, any> | AbstractHttpAdapter<any, any, any>,
    ): void {
        Sentry.captureException(exception);

        if ((host as any).contextType && (host as any).contextType === 'graphql') {
            //do nothing as we want to see the GQL errors in the manager
        } else {
            //do the normal error stuff, so that we return the http error codes if it was a http request
            super.handleUnknownError(exception, host, applicationRef);
        }
    }
}

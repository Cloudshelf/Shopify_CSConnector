import { ArgumentsHost, Catch, HttpServer } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { ExtendedLogger } from '../../utils/ExtendedLogger';

@Catch()
export class SentryFilter extends BaseExceptionFilter {
    readonly logger = new ExtendedLogger('SentryFilter');
    handleUnknownError(
        exception: any,
        host: ArgumentsHost,
        applicationRef: HttpServer<any, any> | AbstractHttpAdapter<any, any, any>,
    ): void {
        this.logger.debug(`In SentryFilter`);
        this.logger.debug(`sending exception to sentry`, JSON.stringify(exception));
        Sentry.captureException(exception);

        if ((host as any).contextType && (host as any).contextType === 'graphql') {
            //do nothing as we want to see the GQL errors in the manager
            this.logger.debug(`doing nothing so we see the errors passed along to the gql request`);
        } else {
            //do the normal error stuff, so that we return the http error codes if it was a http request
            this.logger.debug(`calling super`);
            return super.handleUnknownError(exception, host, applicationRef);
        }
    }
}

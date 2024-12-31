import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { HtmlUtils } from '../../../utils/HtmlUtils';
import { Request, Response } from 'express';

@Catch()
export class NoOAuthCookieExceptionFilter implements ExceptionFilter {
    readonly logger = new ExtendedLogger('NoOAuthCookieExceptionFilter');
    catch(exception: unknown, host: ArgumentsHost) {
        this.logger.debug(`In NoOAuthCookieExceptionFilter`);
        const ctx = host.switchToHttp();
        this.logger.debug('ctx type', (ctx as any).contextType ?? 'unknown');
        this.logger.debug('exception being filtered', exception);
        if ((ctx as any).contextType && (ctx as any).contextType === 'graphql') {
            //do nothing as we want to see the GQL errors in the manager, so we rethrow
            this.logger.debug(`graphql context, skipping`);
            throw exception;
        }

        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        if (
            (exception as any).message &&
            (exception as any).message.toLowerCase().includes('cannot complete oauth process') &&
            request.query.shop
        ) {
            const shop = request.query.shop as string;
            response.end(HtmlUtils.generateExitToInstallPage(shop));
            return;
        }

        throw exception;
    }
}

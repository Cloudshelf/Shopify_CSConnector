import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HtmlUtils } from '../../../utils/HtmlUtils';
import { Request, Response } from 'express';

@Catch(HttpException)
export class NoOAuthCookieExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        if ((ctx as any).contextType && (ctx as any).contextType === 'graphql') {
            //do nothing as we want to see the GQL errors in the manager
            return;
        }

        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const httpStatus =
            exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        //If the exception contains "Cannot complete OAuth process" then redirect to the auth page
        if (
            (exception as any).message &&
            (exception as any).message.toLowerCase().includes('cannot complete oauth process') &&
            request.query.shop
        ) {
            const shop = request.query.shop as string;
            response.end(HtmlUtils.generateExitToInstallPage(shop));
            // response.redirect(`/shopify/offline/auth?shop=${request.query.shop}`);
            return;
        }

        response.status(httpStatus).json({
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}

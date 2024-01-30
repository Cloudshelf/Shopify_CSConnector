import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class NoOAuthCookieExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();

        //If the exception contains "Cannot complete OAuth process" then redirect to the auth page

        if (exception.message.toLowerCase().includes('cannot complete oauth process')) {
            response.redirect(`/shopify/offline/auth?shop=${request.query.shop}`);
            return;
        }

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}

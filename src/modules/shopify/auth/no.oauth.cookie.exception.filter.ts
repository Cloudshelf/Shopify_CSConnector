import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request, Response } from 'express';

@Catch()
export class NoOAuthCookieExceptionFilter implements ExceptionFilter {
    constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        if ((ctx as any).contextType && (ctx as any).contextType === 'graphql') {
            //do nothing as we want to see the GQL errors in the manager
            return;
        }

        const { httpAdapter } = this.httpAdapterHost;
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
            response.redirect(`/shopify/offline/auth?shop=${request.query.shop}`);
            return;
        }

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(ctx.getRequest()),
        };

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}

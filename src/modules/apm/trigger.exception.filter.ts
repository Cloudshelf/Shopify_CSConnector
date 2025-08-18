import { ArgumentsHost, Catch, HttpServer } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class TriggerExceptionFilter extends BaseExceptionFilter {
    handleUnknownError(
        exception: any,
        host: ArgumentsHost,
        applicationRef: HttpServer<any, any> | AbstractHttpAdapter<any, any, any>,
    ): void {
        throw exception;
    }
}

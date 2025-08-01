import { CanActivate, ExecutionContext, UseGuards, applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IncomingMessage } from 'http';
import { ExtendedLogger } from 'src/utils/ExtendedLogger';

export class IncomingMessageWithAuthCode extends IncomingMessage {
    authCode?: number;
}

export interface Context {
    req?: IncomingMessageWithAuthCode;
}

export const AUTH_REQUEST_HEADER_NAME = 'authorization';

export class AuthRequiredGuard implements CanActivate {
    private readonly logger = new ExtendedLogger(AuthRequiredGuard.name);

    constructor(readonly metadataReflector: Reflector) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const graphQLContext: Context = context.getArgByIndex(2) as Context;
        const request = graphQLContext.req;
        if (!request) {
            return false;
        }

        const storeDomain = request.headers['x-store-domain'] as string;
        const hmac = request.headers['x-hmac'] as string;
        const schofield = request.headers['x-nonce'] as string;

        let operationVars = (graphQLContext.req as any).body.variables;
        let vs = Object.keys(operationVars ?? {})
            .sort()
            .reduce((obj, key) => {
                obj[key] = operationVars[key];
                return obj;
            }, {} as any);

        if (!storeDomain || !hmac || !schofield) {
            this.logger.log({ storeDomain, hmac, schofield });
            this.logger.verbose('Blocking request due to missing authorization token');
            request.authCode = 401;
            return false;
        }

        return true;
    }
}

export function AuthRequired() {
    return applyDecorators(UseGuards(AuthRequiredGuard));
}

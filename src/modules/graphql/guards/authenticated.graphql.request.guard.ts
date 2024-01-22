import { CanActivate, ExecutionContext, UseGuards, applyDecorators } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context } from '../graphql.context';
import { ExtendedLogger } from '../../../utils/ExtendedLogger';
import { cloudshelfSchema } from '../../configuration/schemas/cloudshelf.schema';

export const AUTH_REQUEST_HEADER_NAME = 'authorization';

export class AuthenticatedGraphQLUserGuard implements CanActivate {
    private readonly logger = new ExtendedLogger(AuthenticatedGraphQLUserGuard.name);

    constructor(private readonly configService: ConfigService<typeof cloudshelfSchema>) {
        //
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const graphQLContext: Context = context.getArgByIndex(2) as Context;
        const request = graphQLContext.req;
        if (!request) {
            return false;
        }

        const authToken = request.headers[AUTH_REQUEST_HEADER_NAME] as string;

        if (!authToken) {
            this.logger.verbose(`Blocking request as no auth token was provided`);
            request.authCode = 401;
            return false;
        }

        if (
            authToken !== this.configService.get<string>('CLOUDSHELF_MANAGER_ACCESS_TOKEN')! &&
            authToken !== this.configService.get<string>('CLOUDSHELF_NOBLE_ACCESS_TOKEN')!
        ) {
            this.logger.verbose(`Blocking request as auth token was invalid`);
            request.authCode = 401;
            return false;
        }

        return true;
    }
}

export function AuthenticatedGraphqlRequest() {
    return applyDecorators(UseGuards(AuthenticatedGraphQLUserGuard));
}

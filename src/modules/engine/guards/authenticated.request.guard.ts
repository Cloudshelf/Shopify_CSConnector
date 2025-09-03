import {
    CanActivate,
    ExecutionContext,
    Inject,
    Logger,
    UseGuards,
    applyDecorators,
    createParamDecorator,
    forwardRef,
} from '@nestjs/common';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerService } from 'src/modules/retailer/retailer.service';

export const AUTH_REQUEST_HEADER_NAME = 'authorization';

export class AuthenticatedEngineRequestGuard implements CanActivate {
    private readonly logger = new Logger(AuthenticatedEngineRequestGuard.name);

    constructor(@Inject(forwardRef(() => RetailerService)) private readonly retailerService: RetailerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        (request as any).isEngineRequest = true;
        let authToken = request.headers[AUTH_REQUEST_HEADER_NAME] as string;

        if (!authToken) {
            request.authCode = 401;
            return false;
        }

        if (!authToken.toLowerCase().startsWith('bearer ')) {
            request.authCode = 401;
            return false;
        }

        // Remove 'Bearer ' prefix to get the actual token
        authToken = authToken.slice(7);

        const foundRetailer = await this.retailerService.findOneByStorefrontToken(authToken);

        if (!foundRetailer) {
            request.authCode = 401;
            return false;
        }

        // Everything must be okay to get here
        // So now, we need to pop the user object into the request
        // Along with the organisation they are acting for
        (request as any).authenticatedRetailer = foundRetailer;

        return true;
    }
}

export function AuthenticatedEngineRequest() {
    return applyDecorators(UseGuards(AuthenticatedEngineRequestGuard));
}

export const AuthenticatedEngineRetailer = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): RetailerEntity => {
        const request = ctx.switchToHttp().getRequest();

        const r: RetailerEntity = request.authenticatedRetailer as RetailerEntity;

        return r;
    },
);

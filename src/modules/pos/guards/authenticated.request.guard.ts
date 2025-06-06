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
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { shopifySchema } from 'src/modules/configuration/schemas/shopify.schema';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerService } from 'src/modules/retailer/retailer.service';

export const AUTH_REQUEST_HEADER_NAME = 'authorization';

export class AuthenticatedPOSRequestGuard implements CanActivate {
    private readonly logger = new Logger(AuthenticatedPOSRequestGuard.name);

    constructor(
        @Inject(forwardRef(() => RetailerService)) private readonly retailerService: RetailerService,
        private readonly configService: ConfigService<typeof shopifySchema>,
    ) {}

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

        let authTokenForDomain: string | undefined = undefined;

        try {
            const shopifySecret = this.configService.get<string>('SHOPIFY_API_SECRET_KEY');

            if (!shopifySecret) {
                this.logger.error('Shopify Secret not found');
                request.authCode = 500;
                return false;
            }

            const decodedToken = verify(authToken, shopifySecret);
            if (!decodedToken) {
                request.authCode = 401;
                return false;
            }

            // Check if token is expired
            const exp = (decodedToken as any).exp;
            if (!exp) {
                this.logger.debug('Token missing exp claim');
                request.authCode = 401;
                return false;
            }
            const expirationTime = exp * 1000;

            const currentTime = Date.now();

            if (currentTime >= expirationTime) {
                this.logger.debug('Token has expired');
                request.authCode = 401;
                return false;
            }

            // Extract destination from JWT payload
            const destination = (decodedToken as any).dest;
            if (!destination) {
                this.logger.debug('No destination found in token');
                request.authCode = 401;
                return false;
            }
            authTokenForDomain = destination;
            // Strip http:// or https:// from destination if present
            authTokenForDomain = authTokenForDomain?.replace(/^https?:\/\//, '');
        } catch (error) {
            this.logger.debug('JWT verification failed:', error.message);
            request.authCode = 401;
            return false;
        }

        if (!authTokenForDomain) {
            this.logger.error('JWT Validation passed, but unable to extract domain');
            request.authCode = 401;
            return false;
        }

        const foundRetailer = await this.retailerService.findOneByDomain(authTokenForDomain);

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

export function AuthenticatedPOSRequest() {
    return applyDecorators(UseGuards(AuthenticatedPOSRequestGuard));
}

export const AuthenticatedPOSRetailer = createParamDecorator((data: unknown, ctx: ExecutionContext): RetailerEntity => {
    const request = ctx.switchToHttp().getRequest();

    const r: RetailerEntity = request.authenticatedRetailer as RetailerEntity;

    return r;
});

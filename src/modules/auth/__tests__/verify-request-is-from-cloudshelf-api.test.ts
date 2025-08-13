import { Reflector } from '@nestjs/core';
import { VerifyRequestIsFromCloudshelfAPIGuard } from '../verify-request-is-from-cloudshelf-api';
import { CryptographyUtils } from 'src/utils/CryptographyUtils';

jest.mock('src/utils/CryptographyUtils', () => ({
    CryptographyUtils: {
        validateHmac: jest.fn(),
    },
}));

jest.mock('src/utils/ExtendedLogger', () => ({
    ExtendedLogger: jest.fn().mockImplementation(() => ({
        verbose: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
    })),
}));

describe('VerifyRequestIsFromCloudshelfAPIGuard', () => {
    let guard: VerifyRequestIsFromCloudshelfAPIGuard;
    let reflector: Reflector;

    beforeEach(() => {
        reflector = {} as Reflector;
        guard = new VerifyRequestIsFromCloudshelfAPIGuard(reflector);
        jest.clearAllMocks();
    });

    const getContext = (headers: any = {}, variables: any = {}) => ({
        getArgByIndex: (idx: number) => {
            if (idx === 2) {
                return {
                    req: {
                        headers,
                        body: { variables },
                    },
                };
            }
            return undefined;
        },
    });

    it('should return false if request is missing', async () => {
        const context: any = {
            getArgByIndex: () => ({}),
        };
        const result = await guard.canActivate(context);
        expect(result).toBe(false);
    });

    it('should return false if headers are missing', async () => {
        const context: any = getContext({});
        const result = await guard.canActivate(context);
        expect(result).toBe(false);
        expect(context.getArgByIndex(2).req.authCode).toBeUndefined();
    });

    it('should return false and set authCode=500 if secret is missing', async () => {
        const headers = {
            'x-store-domain': 'test.com',
            'x-hmac': 'somehmac',
            'x-nonce': 'somenonce',
        };
        jest.spyOn(CryptographyUtils, 'validateHmac').mockReturnValue(true);
        const oldEnv = process.env.CLOUDSHELF_API_HMAC_KEY;
        delete process.env.CLOUDSHELF_API_HMAC_KEY;
        const context: any = getContext(headers, { foo: 'bar' });
        const req = { headers, body: { variables: { foo: 'bar' } } };
        jest.spyOn(context, 'getArgByIndex').mockImplementation((idx: number) => {
            if (idx === 2) {
                return {
                    req,
                };
            }
            return undefined;
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
        expect(context.getArgByIndex(2).req.authCode).toBe(500);

        process.env.CLOUDSHELF_API_HMAC_KEY = oldEnv;
    });

    it('should return false and set authCode=401 if HMAC is invalid', async () => {
        const headers = {
            'x-store-domain': 'test.com',
            'x-hmac': 'invalidhmac',
            'x-nonce': 'somenonce',
        };
        process.env.CLOUDSHELF_API_HMAC_KEY = 'secret';
        jest.spyOn(CryptographyUtils, 'validateHmac').mockReturnValue(false);
        const req = { headers, body: { variables: { foo: 'bar' } } };
        const context: any = getContext(headers, { foo: 'bar' });
        jest.spyOn(context, 'getArgByIndex').mockImplementation((idx: number) => {
            if (idx === 2) {
                return {
                    req,
                };
            }
            return undefined;
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
        expect(context.getArgByIndex(2).req.authCode).toBe(401);
    });

    it('should return true if HMAC is valid', async () => {
        const headers = {
            'x-store-domain': 'test.com',
            'x-hmac': 'validhmac',
            'x-nonce': 'somenonce',
        };
        process.env.CLOUDSHELF_API_HMAC_KEY = 'secret';
        jest.spyOn(CryptographyUtils, 'validateHmac').mockReturnValue(true);
        const context: any = getContext(headers, { foo: 'bar' });
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
        expect(context.getArgByIndex(2).req.authCode).toBeUndefined();
    });
});

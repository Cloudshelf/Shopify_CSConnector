import { ExtendedLogger } from './ExtendedLogger';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

export class CryptographyUtils {
    static createHmac(data: string, nonce: string) {
        if (!process.env.CLOUDSHELF_API_HMAC_KEY) {
            throw new Error('CLOUDSHELF_API_HMAC_KEY is not set');
        }

        const hmac = crypto.createHmac('sha256', process.env.CLOUDSHELF_API_HMAC_KEY!);
        hmac.update(data + nonce);
        return hmac.digest('hex');
    }

    static validateHmac(hmac: string, data: string, nonce: string) {
        if (!process.env.CLOUDSHELF_API_HMAC_KEY) {
            throw new Error('CLOUDSHELF_API_HMAC_KEY is not set');
        }

        const logger = new ExtendedLogger('validateHmac');
        logger.debug('Validating hmac', { hmac, hasData: !!data, hasNonce: !!nonce });
        const nonceAsTimestamp = parseInt(nonce, 10);
        // Check timestamp is within 5 minutes
        if (Date.now() - nonceAsTimestamp > 5 * 60 * 1000) {
            logger.debug('Timestamp is too old', { nonce, data });
            return false;
        }
        const h = crypto.createHmac('sha256', process.env.CLOUDSHELF_API_HMAC_KEY!);
        h.update(data + nonce);
        const digest = h.digest('hex');
        if (digest !== hmac) {
            logger.debug('Hmacs do not match', {
                expected: digest.substring(0, 8) + '...',
                received: hmac.substring(0, 8) + '...',
            });
        }
        logger.debug('HMAC valid: ' + (digest === hmac));
        return hmac === digest;
    }
}

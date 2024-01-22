import * as crypto from 'crypto';

export class CryptographyUtils {
    static createHmac(data: string, nonce: string) {
        const hmac = crypto.createHmac('sha256', process.env.HMAC_KEY!);
        hmac.update(data + nonce);
        return hmac.digest('hex');
    }
}

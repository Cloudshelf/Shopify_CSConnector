import { CountryCode } from '../graphql/cloudshelf/generated/cloudshelf';

export class MiscellaneousUtils {
    static noop(): void {
        return;
    }

    static isProduction(): boolean {
        return process.env.IS_PRODUCTION === 'true';
    }

    static sleep(milliseconds: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    static convertCountryCode(countryCode: string | null | undefined) {
        //As far as I know, they use the same codes as us... but just in case, ive wrapped this in a util function
        if (!countryCode) {
            return CountryCode.Zz;
        }

        return countryCode as CountryCode;
    }
}

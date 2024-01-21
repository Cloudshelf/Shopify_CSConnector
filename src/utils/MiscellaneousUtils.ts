export class MiscellaneousUtils {
    static noop(): void {
        return;
    }

    static isProduction(): boolean {
        return process.env.IS_PRODUCTION === 'true';
    }
}

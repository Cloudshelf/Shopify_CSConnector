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
}

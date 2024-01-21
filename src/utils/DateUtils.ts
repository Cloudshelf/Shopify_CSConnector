export class DateUtils {
    static NowAsUTCString(): string {
        const now = Date.now();

        const utcDate = new Date(now).toUTCString();

        return utcDate;
    }
}

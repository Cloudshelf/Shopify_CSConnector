import * as Sentry from '@sentry/node';

export class SentryUtil {
    static InformationalTransaction(
        op: string,
        name: string,
        data: any,
        scopeUser?: { id?: string; username?: string },
    ) {
        Sentry.withScope(scope => {
            if (!scopeUser) {
                scope.setUser(null);
            } else {
                scope.setUser(scopeUser);
            }
            Sentry.startTransaction({
                op,
                name,
                data,
            }).finish();
        });
    }
}

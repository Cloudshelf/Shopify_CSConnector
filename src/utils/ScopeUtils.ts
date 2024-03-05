import { AuthScopes } from '@shopify/shopify-api/lib/auth/scopes';

export class ScopeUtils {
    static getList(scopes: (string[] & AuthScopes) | AuthScopes): string[] {
        if (Array.isArray(scopes)) {
            return scopes;
        } else {
            return scopes.toArray();
            // if ((scopes as any).expandedScopes !== undefined) {
            //     return Array.from(scopes.expandedScopes);
            // }
        }
    }
}

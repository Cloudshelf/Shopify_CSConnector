export class GlobalIDUtils {
    static gidBuilder(id: string | number, namespace: string): string {
        return `gid://external/${namespace}/${id}`;
    }

    static gidConverter(shopifyGid: string | null | undefined, namespace: string): string | undefined {
        //If the gid doesn't exist, return undefined
        if (!shopifyGid) {
            return undefined;
        }

        //If the gid doesn't include the shopify prefix, return the gid as we can't handle this
        if (!shopifyGid.includes('gid://shopify')) {
            return shopifyGid;
        }

        try {
            const nonPrefixedId = shopifyGid.substring(shopifyGid.lastIndexOf('/') + 1);
            const newGid = `gid://external/${namespace}/${nonPrefixedId}`;

            return newGid;
        } catch {
            //If anything errors, we can't handle this gid, so return undefined
            return undefined;
        }
    }
}

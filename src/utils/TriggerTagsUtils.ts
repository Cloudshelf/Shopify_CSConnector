export class TriggerTagsUtils {
    static createRetailerTag(retailerId?: string): string {
        if (!retailerId) {
            return '';
        }
        return `retailer_${retailerId}`;
    }

    static createDomainTag(domain: string): string {
        return `domain_${domain.toLowerCase()}`;
    }

    static createTags({
        domain,
        retailerId,
        syncType,
        reason,
    }: {
        domain: string;
        retailerId?: string;
        syncType?: string;
        reason?: string;
    }): string[] {
        const tags = [this.createDomainTag(domain)];
        if (retailerId) {
            tags.push(`retailer_${retailerId}`);
        }
        if (reason) {
            tags.push(`reason_${reason}`);
        }
        if (syncType) {
            tags.push(`sync_type_${syncType}`);
        }
        return tags;
    }
}

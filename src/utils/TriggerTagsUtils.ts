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

    static createReasonTag(reason: string): string {
        return `reason_${reason}`;
    }

    static createTags({
        domain,
        retailerId,
        syncType,
        reason,
    }: {
        domain: string;
        retailerId?: string;
        syncType?: 'type_full' | 'type_partial';
        reason?: string;
    }): string[] {
        const tags = [TriggerTagsUtils.createDomainTag(domain)];
        if (retailerId) {
            tags.push(TriggerTagsUtils.createRetailerTag(retailerId));
        }
        if (reason) {
            tags.push(TriggerTagsUtils.createReasonTag(reason));
        }
        if (syncType) {
            tags.push(syncType);
        }
        return tags;
    }
}

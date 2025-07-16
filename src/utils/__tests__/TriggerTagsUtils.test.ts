import { TriggerTagsUtils } from '../TriggerTagsUtils';

describe('TriggerTagsUtils', () => {
    test.each([
        [
            'with retailId, reason and sync type as null',
            { reason: undefined, syncType: undefined, retailerId: undefined, expectedTags: ['domain_test.com'] },
        ],
        [
            'with retailId, reason and sync type as empty string',
            { reason: '', syncType: undefined, retailerId: '', expectedTags: ['domain_test.com'] },
        ],
        [
            'with retailId as 123, reason and sync type as empty string',
            { reason: '', syncType: undefined, retailerId: '123', expectedTags: ['domain_test.com', 'retailer_123'] },
        ],
    ])('should create tags with domain and retailer id %s', (_, { reason, syncType, retailerId, expectedTags }) => {
        const tags = TriggerTagsUtils.createTags({
            domain: 'test.com',
            retailerId,
            reason,
            syncType,
        });

        expect(tags).toEqual(expectedTags);
    });

    it('should create tags with domain and retailer id and reason', () => {
        const tags = TriggerTagsUtils.createTags({
            domain: 'test.com',
            retailerId: '123',
            reason: 'test',
        });

        expect(tags).toEqual(['domain_test.com', 'retailer_123', 'reason_test']);
    });

    it('should create tags with domain and retailer id and sync type', () => {
        const tags = TriggerTagsUtils.createTags({
            domain: 'test.com',
            retailerId: '123',
            syncType: 'type_full',
        });

        expect(tags).toEqual(['domain_test.com', 'retailer_123', 'type_full']);
    });

    it('should create tags with domain and retailer id and sync type and reason', () => {
        const tags = TriggerTagsUtils.createTags({
            domain: 'test.com',
            retailerId: '123',
            syncType: 'type_full',
            reason: 'test',
        });

        expect(tags).toEqual(['domain_test.com', 'retailer_123', 'reason_test', 'type_full']);
    });
});

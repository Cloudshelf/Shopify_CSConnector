import { CloudshelfApiLocationUtils } from 'src/modules/cloudshelf/cloudshelf.api.location.util';
import { ShopifyGraphqlUtil } from 'src/modules/shopify/shopify.graphql.util';
import { handleSyncLocations } from '../handleSyncLocations';

jest.mock('@trigger.dev/sdk', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('src/modules/shopify/shopify.graphql.util');
jest.mock('src/modules/cloudshelf/cloudshelf.api.location.util');

describe('handleSyncLocations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('paginates Shopify locations and upserts them to Cloudshelf', async () => {
        const query = jest
            .fn()
            .mockResolvedValueOnce({
                data: {
                    locations: {
                        edges: [
                            {
                                node: {
                                    id: 'gid://shopify/Location/1',
                                    name: 'Loc 1',
                                    fulfillsOnlineOrders: true,
                                    address: {
                                        formatted: ['Line 1'],
                                        countryCode: 'US',
                                        address1: '123 Main St',
                                        address2: 'Suite 4',
                                        city: 'Milwaukee',
                                        provinceCode: 'WI',
                                        zip: '53202',
                                        phone: '+14145551234',
                                    },
                                },
                            },
                        ],
                        pageInfo: { hasNextPage: true, endCursor: 'c1' },
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    locations: {
                        edges: [
                            {
                                node: {
                                    id: 'gid://shopify/Location/2',
                                    name: 'Loc 2',
                                    fulfillsOnlineOrders: false,
                                    address: {
                                        formatted: ['Line 2'],
                                        countryCode: 'CA',
                                        address1: null,
                                        address2: null,
                                        city: null,
                                        provinceCode: null,
                                        zip: null,
                                        phone: null,
                                    },
                                },
                            },
                        ],
                        pageInfo: { hasNextPage: false, endCursor: null },
                    },
                },
            });

        (ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer as jest.Mock).mockResolvedValue({ query });

        const env = { CLOUDSHELF_API_URL: 'https://api.cloudshelf.test' } as any;
        const retailer = { id: 'retailer_1', domain: 'test.myshopify.com' } as any;

        await handleSyncLocations(env, {} as any, retailer, 'run_1');

        expect(query).toHaveBeenCalledTimes(2);
        expect(query.mock.calls[0][0].variables.after).toBeNull();
        expect(query.mock.calls[1][0].variables.after).toBe('c1');

        expect(CloudshelfApiLocationUtils.upsertLocations).toHaveBeenCalledTimes(1);
        expect(CloudshelfApiLocationUtils.upsertLocations).toHaveBeenCalledWith(
            'https://api.cloudshelf.test',
            retailer,
            [
                {
                    id: 'gid://external/ShopifyLocation/1',
                    displayName: 'Loc 1',
                    address1: '123 Main St',
                    address2: 'Suite 4',
                    city: 'Milwaukee',
                    provinceCode: 'WI',
                    zip: '53202',
                    phone: '+14145551234',
                    countryCode: 'US',
                    fulfillsOnlineOrders: true,
                },
                {
                    id: 'gid://external/ShopifyLocation/2',
                    displayName: 'Loc 2',
                    address1: 'unknown',
                    address2: null,
                    city: null,
                    provinceCode: null,
                    zip: null,
                    phone: null,
                    countryCode: 'CA',
                    fulfillsOnlineOrders: false,
                },
            ],
            expect.any(Object),
        );
    });

    it("falls back address1 to 'unknown' when Shopify omits it or returns an empty string", async () => {
        const query = jest.fn().mockResolvedValueOnce({
            data: {
                locations: {
                    edges: [
                        {
                            node: {
                                id: 'gid://shopify/Location/10',
                                name: 'No-address loc',
                                fulfillsOnlineOrders: true,
                                address: {
                                    formatted: [],
                                    countryCode: 'GB',
                                    address1: '',
                                    address2: null,
                                    city: null,
                                    provinceCode: null,
                                    zip: null,
                                    phone: null,
                                },
                            },
                        },
                        {
                            node: {
                                id: 'gid://shopify/Location/11',
                                name: 'Missing-address loc',
                                fulfillsOnlineOrders: true,
                                address: null,
                            },
                        },
                    ],
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            },
        });

        (ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer as jest.Mock).mockResolvedValue({ query });

        const env = { CLOUDSHELF_API_URL: 'https://api.cloudshelf.test' } as any;
        const retailer = { id: 'retailer_1', domain: 'test.myshopify.com' } as any;

        await handleSyncLocations(env, {} as any, retailer, 'run_1');

        expect(CloudshelfApiLocationUtils.upsertLocations).toHaveBeenCalledWith(
            'https://api.cloudshelf.test',
            retailer,
            [
                expect.objectContaining({ id: 'gid://external/ShopifyLocation/10', address1: 'unknown' }),
                expect.objectContaining({ id: 'gid://external/ShopifyLocation/11', address1: 'unknown' }),
            ],
            expect.any(Object),
        );
    });

    it('does not upsert when Shopify returns no locations', async () => {
        const query = jest.fn().mockResolvedValueOnce({
            data: {
                locations: {
                    edges: [],
                    pageInfo: { hasNextPage: false, endCursor: null },
                },
            },
        });
        (ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer as jest.Mock).mockResolvedValue({ query });

        const env = { CLOUDSHELF_API_URL: 'https://api.cloudshelf.test' } as any;
        const retailer = { id: 'retailer_1', domain: 'test.myshopify.com' } as any;

        await handleSyncLocations(env, {} as any, retailer, 'run_1');

        expect(CloudshelfApiLocationUtils.upsertLocations).not.toHaveBeenCalled();
    });
});


import { ProcessProductGroupsUtils } from '../process-product-groups.util';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

jest.mock('@trigger.dev/sdk/v3');
jest.mock('src/modules/data-ingestion/sync.job.utils');
jest.mock('src/modules/cloudshelf/cloudshelf.api.products.util');

describe('ProcessProductGroupsUtils', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetAllMocks();
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('updateProductGroups', async () => {
        const retailer = { id: '123', domain: 'example.com' } as RetailerEntity;
        const productIds = ['123', '124', '125'];

        (CloudshelfApiProductUtils.updateProductsInProductGroupInBatches as jest.Mock).mockResolvedValue(undefined);

        await ProcessProductGroupsUtils.updateProductGroups({
            retailer,
            productsInGroups: { '123': productIds },
            cloudshelfAPI: 'https://example.com',
        });
        expect(CloudshelfApiProductUtils.updateProductsInProductGroupInBatches).toHaveBeenCalledWith({
            apiUrl: 'https://example.com',
            domain: 'example.com',
            productGroupUpdateBatch: [
                {
                    productGroupId: '123',
                    productIds: productIds.slice().reverse(),
                },
            ],
        });
    });

    it('updateProductGroups with more than 5 product groups', async () => {
        const retailer = { id: '123', domain: 'example.com' } as RetailerEntity;
        const productIds = ['123', '124', '125', '126', '127', '128'];

        (CloudshelfApiProductUtils.updateProductsInProductGroupInBatches as jest.Mock).mockResolvedValue(undefined);

        await ProcessProductGroupsUtils.updateProductGroups({
            retailer,
            productsInGroups: {
                '123': productIds,
                '124': productIds,
                '125': productIds,
                '126': productIds,
                '127': productIds,
                '128': productIds,
            },
            cloudshelfAPI: 'https://example.com',
        });
        expect(CloudshelfApiProductUtils.updateProductsInProductGroupInBatches).toHaveBeenCalledTimes(2);

        expect(CloudshelfApiProductUtils.updateProductsInProductGroupInBatches).toHaveBeenNthCalledWith(1, {
            apiUrl: 'https://example.com',
            domain: 'example.com',
            productGroupUpdateBatch: [
                {
                    productGroupId: '123',
                    productIds: productIds.slice().reverse(),
                },
                {
                    productGroupId: '124',
                    productIds: productIds.slice().reverse(),
                },
                {
                    productGroupId: '125',
                    productIds: productIds.slice().reverse(),
                },
                {
                    productGroupId: '126',
                    productIds: productIds.slice().reverse(),
                },
                {
                    productGroupId: '127',
                    productIds: productIds.slice().reverse(),
                },
            ],
        });

        expect(CloudshelfApiProductUtils.updateProductsInProductGroupInBatches).toHaveBeenLastCalledWith({
            apiUrl: 'https://example.com',
            domain: 'example.com',
            productGroupUpdateBatch: [
                {
                    productGroupId: '128',
                    productIds: productIds.slice().reverse(),
                },
            ],
        });
    });
});

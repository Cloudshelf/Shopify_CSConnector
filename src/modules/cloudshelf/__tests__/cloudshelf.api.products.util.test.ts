import {
    ProductGroupUpdateBatchItem,
    UpdateProductsInProductGroupInBatchDocument,
} from 'src/graphql/cloudshelf/generated/cloudshelf';
import { CloudshelfApiAuthUtils } from '../cloudshelf.api.auth.util';
import { CloudshelfApiProductUtils } from '../cloudshelf.api.products.util';

jest.mock('../cloudshelf.api.auth.util');

describe('CloudshelfApiProductsUtil', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('updateProductsInProductGroupInBatches', () => {
        test.each([
            {
                name: 'should update products in product group in batches',
                mockMutationResult: {
                    data: {
                        updateProductsInProductGroupInBatch: [{ success: true, productGroupId: '123' }],
                    },
                },
                expectedResponse: [{ success: true, productGroupId: '123' }],
            },
            {
                name: 'should return undefined if the mutation fails',
                mockMutationResult: {
                    errors: [{ message: 'Error' }],
                },
                expectedResponse: undefined,
            },
        ])('$name', async ({ mockMutationResult, expectedResponse }) => {
            const mockApolloClient = {
                mutate: jest.fn().mockResolvedValue(mockMutationResult),
            };
            (CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient as jest.Mock).mockResolvedValue(mockApolloClient);

            const productGroupUpdateBatch: ProductGroupUpdateBatchItem[] = [
                {
                    productGroupId: '123',
                    productIds: ['456', '789'],
                },
            ];
            const response = await CloudshelfApiProductUtils.updateProductsInProductGroupInBatches({
                apiUrl: 'https://api.cloudshelf.com',
                domain: 'test.com',
                productGroupUpdateBatch,
            });

            expect(response).toEqual(expectedResponse);
            expect(CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient).toHaveBeenCalledWith(
                'https://api.cloudshelf.com',
                'test.com',
                undefined,
            );
            expect(mockApolloClient.mutate).toHaveBeenCalledWith({
                mutation: UpdateProductsInProductGroupInBatchDocument,
                variables: {
                    productGroupUpdateBatchInput: {
                        productGroupUpdateBatch,
                    },
                },
            });
        });
    });
});

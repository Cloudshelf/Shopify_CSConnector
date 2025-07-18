import { ProductGroupUpdateBatchItem } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/postgresql';
import { ProcessProductGroupsUtils } from '../process-product-groups.util';
import * as TriggerFncs from '@trigger.dev/sdk/v3';
import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs';
import { WriteStream } from 'fs';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { BulkOperationUtils } from 'src/modules/data-ingestion/bulk.operation.utils';
import * as PostSyncJobUtils from 'src/modules/data-ingestion/sync.job.utils';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import * as GlobalIDUtils from 'src/utils/GlobalIDUtils';
import * as JsonLUtils from 'src/utils/JsonLUtils';
import * as streamPromises from 'stream/promises';
import * as ulid from 'ulid';

jest.mock('@trigger.dev/sdk/v3');
jest.mock('src/modules/data-ingestion/sync.job.utils');
jest.mock('axios');
jest.mock('ulid');
jest.mock('stream/promises');
jest.mock('src/utils/JsonLUtils');
jest.mock('src/utils/GlobalIDUtils');
jest.mock('src/modules/data-ingestion/bulk.operation.utils');
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

    describe('ProcessProductGroupsUtils', () => {
        beforeEach(() => {
            jest.resetAllMocks();
            jest.resetModules();
        });

        test.each([
            [
                'should validate and return an error if the env vars are not set',
                {
                    envVars: {
                        CLOUDFLARE_R2_PUBLIC_ENDPOINT: '',
                        FILE_PREFIX: '',
                        SHOPIFY_CONNECTOR_HOST: '',
                        CLOUDSHELF_API_URL: '',
                    },
                    expectedResult: {
                        error: expect.any(Error),
                        envVars: {},
                    },
                },
            ],
            [
                'should validate and return the env vars if they are set',
                {
                    envVars: {
                        CLOUDFLARE_R2_PUBLIC_ENDPOINT: 'https://example.com',
                        FILE_PREFIX: 'test',
                        SHOPIFY_CONNECTOR_HOST: 'https://example.com',
                        CLOUDSHELF_API_URL: 'https://example.com',
                    },
                    expectedResult: {
                        error: null,
                        envVars: {
                            cloudshelfAPI: 'https://example.com',
                            shopifyConnectorHost: 'https://example.com',
                            cloudflareR2PublicEndpoint: 'https://example.com',
                            filePrefix: 'test',
                        },
                    },
                },
            ],
        ])('validateAndGetEnvVars: %s', (_, { envVars, expectedResult }) => {
            process.env = { ...envVars };
            console.log('process.env', process.env);
            expect(ProcessProductGroupsUtils.validateAndGetEnvVars()).toEqual(expectedResult);
        });

        test.each([
            ['has a retailer', { hasRetailer: true, fullSync: true }],
            ['has a retailer with fullSync false', { hasRetailer: true, fullSync: false }],
            ['has no retailer', { hasRetailer: false, fullSync: true }],
        ])('handleComplete: %s', async (_, { hasRetailer, fullSync }) => {
            jest.useFakeTimers().setSystemTime(new Date('2025-07-14 00:00:00'));
            const em = {
                flush: jest.fn(),
            } as unknown as EntityManager;

            (TriggerFncs.logger.info as jest.Mock).mockImplementation(() => {});
            (PostSyncJobUtils.PostSyncJobUtils.scheduleJob as jest.Mock).mockImplementation(() => {});
            const msg = 'test';
            const payload = { fullSync };
            const retailer = hasRetailer ? ({ id: '123' } as RetailerEntity) : undefined;
            await ProcessProductGroupsUtils.handleComplete({ em, msg, retailer, payload });

            expect(em.flush).toHaveBeenCalled();
            if (hasRetailer) {
                expect(PostSyncJobUtils.PostSyncJobUtils.scheduleJob).toHaveBeenCalledWith(
                    !fullSync
                        ? { ...retailer, lastProductGroupSync: new Date() }
                        : { ...retailer, lastProductGroupSync: new Date(), lastSafetySyncCompleted: new Date() },
                    undefined,
                    {
                        info: expect.any(Function),
                        warn: expect.any(Function),
                        error: expect.any(Function),
                    },
                );
            } else {
                expect(PostSyncJobUtils.PostSyncJobUtils.scheduleJob).not.toHaveBeenCalled();
            }

            expect(TriggerFncs.logger.info).toHaveBeenCalledWith('handleComplete', {
                msg: 'test',
                retailer: hasRetailer ? '123' : 'no retailer',
                fullSync,
            });
        });

        test('writeToFile', async () => {
            jest.spyOn(fs, 'createWriteStream').mockImplementation(() => {
                return {
                    pipe: jest.fn(),
                } as unknown as WriteStream;
            });

            jest.spyOn(axios, 'get').mockImplementation(async () => {
                return {
                    data: {
                        pipe: jest.fn(),
                    },
                } as unknown as AxiosResponse;
            });

            (ulid.ulid as jest.Mock).mockReturnValue('123');
            (streamPromises.finished as jest.Mock).mockImplementation(() => {});
            (fs.createWriteStream as jest.Mock).mockImplementation(() => {});

            const dataUrl = 'https://example.com';
            const result = await ProcessProductGroupsUtils.writeToFile(dataUrl);

            expect(ulid.ulid).toHaveBeenCalled();
            expect(streamPromises.finished).toHaveBeenCalled();
            expect(fs.createWriteStream).toHaveBeenCalledWith('/tmp/123.jsonl');
            expect(axios.get).toHaveBeenCalledWith(dataUrl, { responseType: 'stream' });

            expect(result).toBe('/tmp/123.jsonl');
        });
    });

    test.each([
        ['has featured image', { groupExists: true }],
        ['does not have featured image', { groupExists: false }],
    ])('handleProductInCollection: %s', (_, { groupExists }) => {
        const collectionId = 'gid://shopify/Collection/123';
        const productsInGroups = groupExists ? { [collectionId]: ['123'] } : {};
        const product = {
            id: '123',
            featuredImage: { url: 'https://example-prod-feat.com' },
        };
        jest.spyOn(GlobalIDUtils.GlobalIDUtils, 'gidConverter').mockImplementation(() => {
            return '123';
        });
        ProcessProductGroupsUtils.handleProductInCollection({
            product,
            productsInGroups: productsInGroups as { [productGroupId: string]: string[] },
            collectionId,
        });
        if (groupExists) {
            expect(productsInGroups).toEqual({ [collectionId]: ['123', '123'] });
        } else {
            expect(productsInGroups).toEqual({ [collectionId]: ['123'] });
        }
    });

    test.each([
        ['has featured image and image', { hasFeaturedImage: true, image: 'https://image-example.com' }],
        ['has featured image and no image', { hasFeaturedImage: true, image: undefined }],
        ['does not have featured image but has image', { hasFeaturedImage: false, image: 'https://image-example.com' }],
    ])('handleFeaturedImage: %s', (_, { hasFeaturedImage, image }) => {
        const product = { featuredImage: { url: hasFeaturedImage ? 'https://example-prod-feat.com' : undefined } };
        const result = ProcessProductGroupsUtils.handleFeaturedImage({ product, image });
        if (hasFeaturedImage && image) {
            expect(result).toBe('https://image-example.com');
        } else if (image) {
            expect(result).toBe('https://image-example.com');
        } else {
            expect(result).toBeUndefined();
        }
    });

    test('getBulkOperationRecordAndRetailer:', async () => {
        const retailer = { id: '123' };
        (BulkOperationUtils.getOneByThirdPartyId as jest.Mock).mockResolvedValue({
            id: '123',
        });
        const result = await ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer({
            em: {
                findOne: jest.fn().mockResolvedValue(retailer),
            } as unknown as EntityManager,
            remoteBulkOperationId: '123',
        });
        expect(result).toEqual({ bulkOperationRecord: { id: '123' }, retailer: { id: '123', syncErrorCode: null } });
    });

    it('getBulkOperationRecordAndRetailer: no bulk operation record', async () => {
        (BulkOperationUtils.getOneByThirdPartyId as jest.Mock).mockResolvedValue(null);

        await expect(
            ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer({
                em: {
                    findOne: jest.fn().mockResolvedValue(null),
                } as unknown as EntityManager,
                remoteBulkOperationId: '123',
            }),
        ).rejects.toThrow();
    });

    it('getBulkOperationRecordAndRetailer: no retailer record', async () => {
        (BulkOperationUtils.getOneByThirdPartyId as jest.Mock).mockResolvedValue({});

        await expect(
            ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer({
                em: {
                    findOne: jest.fn().mockResolvedValue(null),
                } as unknown as EntityManager,
                remoteBulkOperationId: '123',
            }),
        ).rejects.toThrow();
    });

    describe('readJsonl', () => {
        test('should read a jsonl file, empty productGroupInputs and productsInGroups', async () => {
            jest.spyOn(JsonLUtils.JsonLUtils, 'readJsonl').mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    for (const collection of []) {
                        yield collection;
                    }
                },
            }));

            jest.spyOn(GlobalIDUtils.GlobalIDUtils, 'gidConverter').mockImplementation(
                (shopifyGid: string | null | undefined) => {
                    return shopifyGid ? shopifyGid : undefined;
                },
            );

            const result = await ProcessProductGroupsUtils.readJsonl('/tmp/123.jsonl');
            expect(result).toEqual({ productGroupInputs: [], productsInGroups: {} });
        });

        it('should skip a collection if it is not published on current publication', async () => {
            const collectionId = 'gid://shopify/Collection/123';
            const mockCollection = [
                {
                    publishedOnCurrentPublication: false,
                    image: {
                        url: 'https://example.com',
                    },
                    id: '123',
                    Product: [],
                },
            ];
            jest.spyOn(TriggerFncs.logger, 'info').mockImplementation(() => {});
            jest.spyOn(JsonLUtils.JsonLUtils, 'readJsonl').mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    for (const collection of mockCollection) {
                        yield collection;
                    }
                },
            }));

            jest.spyOn(GlobalIDUtils.GlobalIDUtils, 'gidConverter').mockImplementation(() => {
                return collectionId;
            });

            const result = await ProcessProductGroupsUtils.readJsonl('/tmp/123.jsonl');
            expect(result).toEqual({ productGroupInputs: [], productsInGroups: {} });
            expect(TriggerFncs.logger.info).toHaveBeenCalledWith(
                `Skipping collection ${collectionId} as it is not published on current publication`,
            );
        });

        test.each([
            ['collection has imageUrl', { hasImageUrl: true }],
            ['collection does not have imageUrl', { hasImageUrl: false }],
        ])('%s', async (_, { hasImageUrl }) => {
            const collectionId = 'gid://shopify/Collection/123';
            const mockCollection = [
                {
                    publishedOnCurrentPublication: true,
                    image: hasImageUrl ? { url: 'https://example.com' } : undefined,
                    id: '123',
                    Product: [
                        {
                            featuredImage: { url: 'https://example-prod-feat.com' },
                            id: '123',
                        },
                    ],
                },
            ];
            jest.spyOn(TriggerFncs.logger, 'info').mockImplementation(() => {});
            jest.spyOn(JsonLUtils.JsonLUtils, 'readJsonl').mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    for (const collection of mockCollection) {
                        yield collection;
                    }
                },
            }));

            jest.spyOn(GlobalIDUtils.GlobalIDUtils, 'gidConverter').mockImplementation(() => {
                return collectionId;
            });

            const result = await ProcessProductGroupsUtils.readJsonl('/tmp/123.jsonl');
            expect(result).toEqual({
                productGroupInputs: [
                    {
                        displayName: undefined,
                        featuredImage: hasImageUrl
                            ? {
                                  preferredImage: false,
                                  url: 'https://example.com',
                              }
                            : {
                                  preferredImage: false,
                                  url: 'https://example-prod-feat.com',
                              },
                        id: collectionId,
                        metadata: [],
                    },
                ],
                productsInGroups: {
                    [collectionId]: ['gid://shopify/Collection/123'],
                },
            });
            expect(TriggerFncs.logger.info).not.toHaveBeenCalled();
        });
    });
});

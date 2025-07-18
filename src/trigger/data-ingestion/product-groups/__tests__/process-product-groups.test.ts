import { BulkOperationStatus } from 'src/graphql/shopifyAdmin/generated/shopifyAdmin';
import { FlushMode } from '@mikro-orm/core';
import { runInternal } from '../process-product-groups';
import { ProcessProductGroupsUtils } from '../process-product-groups.util';
import * as TriggerFncs from '@trigger.dev/sdk/v3';
import * as fs from 'fs';
import { CloudshelfApiCloudshelfUtils } from 'src/modules/cloudshelf/cloudshelf.api.cloudshelf.util';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { CloudshelfApiReportUtils } from 'src/modules/cloudshelf/cloudshelf.api.report.util';
import * as ReusableFcns from 'src/trigger/reuseables/db';

jest.mock('@trigger.dev/sdk/v3');
jest.mock('src/trigger/data-ingestion/product-groups/process-product-groups.util');
jest.mock('src/trigger/reuseables/db');
jest.mock('src/modules/cloudshelf/cloudshelf.api.report.util');
jest.mock('src/modules/cloudshelf/cloudshelf.api.cloudshelf.util');
jest.mock('src/modules/cloudshelf/cloudshelf.api.products.util');

describe('runInternal', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('should throw error if vars are invalid', async () => {
        (TriggerFncs.logger.error as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.validateAndGetEnvVars as jest.Mock).mockImplementation(() => ({
            error: { message: 'Invalid env' },
            envVars: {},
        }));

        const payload = {
            remoteBulkOperationId: '123',
            fullSync: true,
        };
        await expect(runInternal(payload)).rejects.toThrow();
        expect(TriggerFncs.logger.error).toHaveBeenCalledWith(`Invalid environment variables: Invalid env`);
    });

    it('should throw error if app data source is not found', async () => {
        (TriggerFncs.logger.error as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.validateAndGetEnvVars as jest.Mock).mockImplementation(() => ({
            envVars: { cloudshelfAPI: 'https://example.com' },
        }));
        (ReusableFcns.getDbForTrigger as jest.Mock).mockImplementation(() => null);

        const payload = {
            remoteBulkOperationId: '123',
            fullSync: true,
        };
        await expect(runInternal(payload)).rejects.toThrow();
        expect(TriggerFncs.logger.error).toHaveBeenCalledWith('AppDataSource is not set');
    });

    test.each([
        ['has no dataUrl but status is completed', { dataUrl: null, status: BulkOperationStatus.Completed }],
        [
            'has dataUrl but status is not completed',
            { dataUrl: 'https://example.com', status: BulkOperationStatus.Created },
        ],
    ])('should end early if bulkOperationRecord %s', async (_, { dataUrl, status }) => {
        const em = {};
        const fork = jest.fn().mockImplementation(() => em);
        (TriggerFncs.logger.warn as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.validateAndGetEnvVars as jest.Mock).mockImplementation(() => ({
            envVars: { cloudshelfAPI: 'https://example.com' },
        }));
        (ReusableFcns.getDbForTrigger as jest.Mock).mockImplementation(() => {
            return {
                em: { fork },
            };
        });
        (ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer as jest.Mock).mockImplementation(() => ({
            bulkOperationRecord: {
                dataUrl,
                status,
            },
            retailer: {},
        }));
        (ProcessProductGroupsUtils.handleComplete as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.writeToFile as jest.Mock).mockImplementation(() => {});
        const payload = {
            remoteBulkOperationId: '123',
            fullSync: true,
        };
        await runInternal(payload);

        expect(fork).toHaveBeenCalledWith({
            flushMode: FlushMode.COMMIT,
        });

        expect(ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer).toHaveBeenCalledWith({
            em,
            remoteBulkOperationId: '123',
        });
        expect(TriggerFncs.logger.warn).toHaveBeenCalledWith(
            `Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`,
        );
        expect(ProcessProductGroupsUtils.handleComplete).toHaveBeenCalledWith({
            em,
            msg: `No Data URL, or shopify job failed. Status: ${status}`,
            retailer: {},
            payload,
        });
        expect(ProcessProductGroupsUtils.writeToFile).not.toHaveBeenCalled();
    });

    test.each([
        ['has no dataUrl but status is completed', { dataUrl: null, status: BulkOperationStatus.Completed }],
        [
            'has dataUrl but status is not completed',
            { dataUrl: 'https://example.com', status: BulkOperationStatus.Created },
        ],
    ])('should end early if bulkOperationRecord %s', async (_, { dataUrl, status }) => {
        const em = {};
        const fork = jest.fn().mockImplementation(() => em);
        (TriggerFncs.logger.warn as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.validateAndGetEnvVars as jest.Mock).mockImplementation(() => ({
            envVars: { cloudshelfAPI: 'https://example.com' },
        }));
        (ReusableFcns.getDbForTrigger as jest.Mock).mockImplementation(() => {
            return {
                em: { fork },
            };
        });
        (ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer as jest.Mock).mockImplementation(() => ({
            bulkOperationRecord: {
                dataUrl,
                status,
            },
            retailer: {},
        }));
        (ProcessProductGroupsUtils.handleComplete as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.writeToFile as jest.Mock).mockImplementation(() => {});
        const payload = {
            remoteBulkOperationId: '123',
            fullSync: true,
        };
        await runInternal(payload);

        expect(fork).toHaveBeenCalledWith({
            flushMode: FlushMode.COMMIT,
        });

        expect(ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer).toHaveBeenCalledWith({
            em,
            remoteBulkOperationId: '123',
        });
        expect(TriggerFncs.logger.warn).toHaveBeenCalledWith(
            `Bulk Operation has no data URL, or its status is not "completed. Shopify Job failed."`,
        );
        expect(ProcessProductGroupsUtils.handleComplete).toHaveBeenCalledWith({
            em,
            msg: `No Data URL, or shopify job failed. Status: ${status}`,
            retailer: {},
            payload,
        });
        expect(ProcessProductGroupsUtils.writeToFile).not.toHaveBeenCalled();
    });

    test.each([
        ['fullSync is true', { fullSync: true }],
        ['fullSync is false', { fullSync: false }],
    ])('should call the right functions when %s', async (_, { fullSync }) => {
        const em = {};
        const fork = jest.fn().mockImplementation(() => em);
        (TriggerFncs.logger.warn as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.validateAndGetEnvVars as jest.Mock).mockImplementation(() => ({
            envVars: { cloudshelfAPI: 'https://example.com' },
        }));
        (ReusableFcns.getDbForTrigger as jest.Mock).mockImplementation(() => {
            return {
                em: { fork },
            };
        });
        (ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer as jest.Mock).mockImplementation(() => ({
            bulkOperationRecord: {
                dataUrl: 'https://example.com',
                status: BulkOperationStatus.Completed,
            },
            retailer: {
                domain: 'example.com',
            },
        }));
        jest.spyOn(fs.promises, 'unlink').mockImplementation(() => Promise.resolve());

        (ProcessProductGroupsUtils.handleComplete as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.writeToFile as jest.Mock).mockImplementation(() => {});
        (CloudshelfApiReportUtils.reportCatalogStats as jest.Mock).mockImplementation(() => ({
            data: [],
        }));
        (ProcessProductGroupsUtils.readJsonl as jest.Mock).mockImplementation(() => ({
            productGroupInputs: [],
            productsInGroups: {},
        }));
        (CloudshelfApiProductUtils.updateProductGroups as jest.Mock).mockImplementation(() => {});
        (ProcessProductGroupsUtils.updateProductGroups as jest.Mock).mockImplementation(() => {});
        (CloudshelfApiCloudshelfUtils.createFirstCloudshelfIfRequired as jest.Mock).mockImplementation(() => {});
        const payload = {
            remoteBulkOperationId: '123',
            fullSync,
        };
        await runInternal(payload);

        expect(fork).toHaveBeenCalledWith({
            flushMode: FlushMode.COMMIT,
        });

        expect(ProcessProductGroupsUtils.getBulkOperationRecordAndRetailer).toHaveBeenCalledWith({
            em,
            remoteBulkOperationId: '123',
        });
        expect(ProcessProductGroupsUtils.handleComplete).not.toHaveBeenCalledWith({
            em,
            msg: `No Data URL, or shopify job failed. Status: ${BulkOperationStatus.Completed}`,
            retailer: {},
        });
        expect(ProcessProductGroupsUtils.writeToFile).toHaveBeenCalledWith('https://example.com');

        if (fullSync) {
            expect(CloudshelfApiReportUtils.reportCatalogStats).toHaveBeenCalledWith(
                'https://example.com',
                'example.com',
                {
                    knownNumberOfProductGroups: 0,
                    knownNumberOfProducts: undefined,
                    knownNumberOfProductVariants: undefined,
                    knownNumberOfImages: undefined,
                },
            );
        } else {
            expect(CloudshelfApiReportUtils.reportCatalogStats).not.toHaveBeenCalled();
        }
        expect(ProcessProductGroupsUtils.handleComplete).toHaveBeenCalledWith({
            em,
            msg: 'job complete',
            retailer: {
                domain: 'example.com',
            },
            payload,
        });
    });
});

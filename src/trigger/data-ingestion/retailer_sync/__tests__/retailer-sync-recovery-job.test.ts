import { OrganisationSyncRecoveryReason } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/core';
import { logger, runs } from '@trigger.dev/sdk/v3';
import { CloudshelfApiProductUtils } from 'src/modules/cloudshelf/cloudshelf.api.products.util';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { RetailerStatus } from 'src/modules/retailer/retailer.status.enum';
import { getDbForTrigger, getEnvConfig } from 'src/trigger/reuseables/initialization';
import { RetailerSyncJob } from '../retailer-sync-job';
import {
    getActiveRetailers,
    getIngestionStatsPayload,
    getSyncStatusFromIngestionStats,
    recoverRetailerSync,
    runInternal,
} from '../retailer-sync-recovery-job';

jest.mock('src/modules/cloudshelf/cloudshelf.api.products.util');
jest.mock('src/trigger/reuseables/initialization', () => ({
    getDbForTrigger: jest.fn(),
    getEnvConfig: jest.fn(),
}));
jest.mock('../retailer-sync-job', () => ({
    RetailerSyncJob: {
        trigger: jest.fn(),
    },
}));
jest.mock('src/trigger/queues', () => ({
    IngestionQueue: {},
}));
jest.mock('@trigger.dev/sdk', () => ({
    queue: jest.fn(() => ({})),
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
    },
    task: jest.fn(() => ({})),
    AbortTaskRunError: class AbortTaskRunError extends Error {},
}));
jest.mock('@trigger.dev/sdk/v3', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
    },
    runs: {
        list: jest.fn(),
        cancel: jest.fn(),
    },
    task: jest.fn(() => ({})),
}));

describe('retailer-sync-recovery-job', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getSyncStatusFromIngestionStats', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

        it('should return undefined when payload is undefined', () => {
            const result = getSyncStatusFromIngestionStats({ payload: undefined, now });
            expect(result).toBeUndefined();
        });

        it('should return undefined when lastIngestionDataDate is missing', () => {
            const result = getSyncStatusFromIngestionStats({ payload: {}, now });
            expect(result).toBeUndefined();
        });

        it('should return "overdue" when ingestion is stale (more than 1 day old)', () => {
            const staleDate = new Date(now.getTime() - ONE_DAY_IN_MS - 1000);
            const payload = {
                lastIngestionDataDate: staleDate.toISOString(),
            };
            const result = getSyncStatusFromIngestionStats({ payload, now });
            expect(result).toBe('overdue');
        });

        it('should return "ok" when ingestion is fresh and all catalog stats are as expected', () => {
            const freshDate = new Date(now.getTime() - 1000); // 1 second ago
            const recentReportedAt = new Date(now.getTime() - 1000);
            const payload = {
                lastIngestionDataDate: freshDate.toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForVariants: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForProductGroups: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
            } as any;
            const result = getSyncStatusFromIngestionStats({ payload, now });
            expect(result).toBe('ok');
        });

        it('should return "mismatch" when a catalog stat is not as expected', () => {
            const freshDate = new Date(now.getTime() - 1000);
            const recentReportedAt = new Date(now.getTime() - 1000);
            const payload = {
                lastIngestionDataDate: freshDate.toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: false,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForVariants: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForProductGroups: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
            } as any;
            const result = getSyncStatusFromIngestionStats({ payload, now });
            expect(result).toBe('mismatch');
        });

        it('should return "mismatch" when a catalog stat reportedAt is stale', () => {
            const freshDate = new Date(now.getTime() - 1000);
            const staleReportedAt = new Date(now.getTime() - ONE_DAY_IN_MS - 1000);
            const recentReportedAt = new Date(now.getTime() - 1000);
            const payload = {
                lastIngestionDataDate: freshDate.toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: staleReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForVariants: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForProductGroups: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
            } as any;
            const result = getSyncStatusFromIngestionStats({ payload, now });
            expect(result).toBe('mismatch');
        });

        it('should ignore catalog stats without reportedAt', () => {
            const freshDate = new Date(now.getTime() - 1000);
            const payload = {
                lastIngestionDataDate: freshDate.toISOString(),
                lastReportedCatalogStatsForProducts: {
                    asExpected: false,
                },
                lastReportedCatalogStatsForVariants: {
                    asExpected: false,
                },
                lastReportedCatalogStatsForProductGroups: {
                    asExpected: false,
                },
            } as any;
            const result = getSyncStatusFromIngestionStats({ payload, now });
            expect(result).toBe('ok');
        });

        it('should return "mismatch" when variant stats are not as expected', () => {
            const freshDate = new Date(now.getTime() - 1000);
            const recentReportedAt = new Date(now.getTime() - 1000);
            const payload = {
                lastIngestionDataDate: freshDate.toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForVariants: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: false,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForProductGroups: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
            } as any;
            const result = getSyncStatusFromIngestionStats({ payload, now });
            expect(result).toBe('mismatch');
        });

        it('should return "mismatch" when product group stats are not as expected', () => {
            const freshDate = new Date(now.getTime() - 1000);
            const recentReportedAt = new Date(now.getTime() - 1000);
            const payload = {
                lastIngestionDataDate: freshDate.toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForVariants: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: true,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
                lastReportedCatalogStatsForProductGroups: {
                    reportedAt: recentReportedAt.toISOString(),
                    asExpected: false,
                    extraInformation: '',
                    numberHeldAtTimeOfReporting: 0,
                },
            } as any;
            const result = getSyncStatusFromIngestionStats({ payload, now });
            expect(result).toBe('mismatch');
        });
    });

    describe('getActiveRetailers', () => {
        it('should return active retailers from entity manager', async () => {
            const mockEntityManager = {
                find: jest.fn(),
            } as unknown as EntityManager;

            const mockRetailers = [
                {
                    id: 'retailer1',
                    domain: 'test1.com',
                    status: RetailerStatus.ACTIVE,
                },
                {
                    id: 'retailer2',
                    domain: 'test2.com',
                    status: RetailerStatus.ACTIVE,
                },
            ] as RetailerEntity[];

            (mockEntityManager.find as jest.Mock).mockResolvedValue(mockRetailers);

            const result = await getActiveRetailers(mockEntityManager);

            expect(result).toEqual(mockRetailers);
            expect(mockEntityManager.find).toHaveBeenCalledWith(RetailerEntity, {
                status: RetailerStatus.ACTIVE,
            });
        });

        it('should return empty array when no active retailers found', async () => {
            const mockEntityManager = {
                find: jest.fn(),
            } as unknown as EntityManager;

            (mockEntityManager.find as jest.Mock).mockResolvedValue([]);

            const result = await getActiveRetailers(mockEntityManager);

            expect(result).toEqual([]);
            expect(mockEntityManager.find).toHaveBeenCalledWith(RetailerEntity, {
                status: RetailerStatus.ACTIVE,
            });
        });
    });

    describe('getIngestionStatsPayload', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const apiURL = 'https://api.cloudshelf.com';
        const domain = 'test.com';

        beforeEach(() => {
            (logger.error as jest.Mock).mockClear();
        });

        it('should return undefined when apiURL is missing', async () => {
            const result = await getIngestionStatsPayload({ apiURL: '', domain, now });
            expect(result).toBeUndefined();
            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).not.toHaveBeenCalled();
        });

        it('should return undefined when domain is missing', async () => {
            const result = await getIngestionStatsPayload({ apiURL, domain: '', now });
            expect(result).toBeUndefined();
            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).not.toHaveBeenCalled();
        });

        it('should return sync status when ingestion stats are retrieved successfully', async () => {
            const mockPayload = {
                lastIngestionDataDate: new Date(now.getTime() - 1000).toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: true,
                },
                lastReportedCatalogStatsForVariants: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: true,
                },
                lastReportedCatalogStatsForProductGroups: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: true,
                },
            };

            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue(mockPayload);

            const result = await getIngestionStatsPayload({ apiURL, domain, now });

            expect(result).toBe('ok');
            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).toHaveBeenCalledWith(apiURL, domain);
        });

        it('should return "mismatch" status when stats indicate mismatch', async () => {
            const mockPayload = {
                lastIngestionDataDate: new Date(now.getTime() - 1000).toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: false,
                },
            };

            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue(mockPayload);

            const result = await getIngestionStatsPayload({ apiURL, domain, now });

            expect(result).toBe('mismatch');
        });

        it('should return "overdue" status when ingestion is stale', async () => {
            const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
            const mockPayload = {
                lastIngestionDataDate: new Date(now.getTime() - ONE_DAY_IN_MS - 1000).toISOString(),
            };

            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue(mockPayload);

            const result = await getIngestionStatsPayload({ apiURL, domain, now });

            expect(result).toBe('overdue');
        });

        it('should return undefined and log error when API call fails', async () => {
            const error = new Error('API Error');
            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockRejectedValue(error);

            const result = await getIngestionStatsPayload({ apiURL, domain, now });

            expect(result).toBeUndefined();
            expect(logger.error).toHaveBeenCalledWith(`Failed to get ingestion stats payload for ${domain}`, {
                error: JSON.stringify(error),
            });
        });
    });

    describe('recoverRetailerSync', () => {
        const now = new Date('2024-01-15T12:00:00Z');
        const apiUrl = 'https://api.cloudshelf.com';

        const mockRetailer = {
            id: 'retailer1',
            domain: 'test.com',
            status: RetailerStatus.ACTIVE,
        } as RetailerEntity;

        beforeEach(() => {
            (logger.info as jest.Mock).mockClear();
            (logger.trace as jest.Mock).mockClear();
            (logger.error as jest.Mock).mockClear();
            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockClear();
            (RetailerSyncJob.trigger as jest.Mock).mockClear();
            (logger.trace as jest.Mock).mockImplementation((message, fn) => {
                if (typeof fn === 'function') {
                    return fn();
                }
            });
        });

        it('should trigger recovery with Resync reason when status is mismatch', async () => {
            const mockPayload = {
                lastIngestionDataDate: new Date(now.getTime() - 1000).toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: false,
                },
            };

            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue(mockPayload);
            (RetailerSyncJob.trigger as jest.Mock).mockResolvedValue(undefined);

            await recoverRetailerSync({ retailer: mockRetailer, now, apiUrl });

            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).toHaveBeenCalledWith(apiUrl, mockRetailer.domain);
            expect(logger.info).toHaveBeenCalledWith(`Retailer ${mockRetailer.domain} sync status: mismatch`);
            expect(RetailerSyncJob.trigger).toHaveBeenCalledWith({
                organisationId: mockRetailer.id,
                fullSync: true,
                recoveryReason: OrganisationSyncRecoveryReason.Resync,
            });
        });

        it('should trigger recovery with Unblock reason when status is overdue', async () => {
            const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
            const mockPayload = {
                lastIngestionDataDate: new Date(now.getTime() - ONE_DAY_IN_MS - 1000).toISOString(),
            };

            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue(mockPayload);
            (RetailerSyncJob.trigger as jest.Mock).mockResolvedValue(undefined);

            await recoverRetailerSync({ retailer: mockRetailer, now, apiUrl });

            expect(logger.info).toHaveBeenCalledWith(`Retailer ${mockRetailer.domain} sync status: overdue`);
            expect(RetailerSyncJob.trigger).toHaveBeenCalledWith({
                organisationId: mockRetailer.id,
                fullSync: true,
                recoveryReason: OrganisationSyncRecoveryReason.Unblock,
            });
        });

        it('should not trigger recovery when status is ok', async () => {
            const mockPayload = {
                lastIngestionDataDate: new Date(now.getTime() - 1000).toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: true,
                },
                lastReportedCatalogStatsForVariants: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: true,
                },
                lastReportedCatalogStatsForProductGroups: {
                    reportedAt: new Date(now.getTime() - 1000).toISOString(),
                    asExpected: true,
                },
            };

            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue(mockPayload);

            await recoverRetailerSync({ retailer: mockRetailer, now, apiUrl });

            expect(logger.info).toHaveBeenCalledWith(`Retailer ${mockRetailer.domain} sync status: ok`);
            expect(logger.info).toHaveBeenCalledWith(
                `Retailer ${mockRetailer.domain} has a sync ok, no recovery needed`,
            );
            expect(RetailerSyncJob.trigger).not.toHaveBeenCalled();
        });

        it('should not trigger recovery when status is undefined', async () => {
            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue(undefined);

            await recoverRetailerSync({ retailer: mockRetailer, now, apiUrl });

            expect(logger.info).toHaveBeenCalledWith(`Retailer ${mockRetailer.domain} sync status: undefined`);
            expect(logger.info).toHaveBeenCalledWith(
                `Retailer ${mockRetailer.domain} has a sync ok, no recovery needed`,
            );
            expect(RetailerSyncJob.trigger).not.toHaveBeenCalled();
        });

        it('should log error and not throw when API call fails', async () => {
            const error = new Error('API Error');
            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockRejectedValue(error);

            await expect(recoverRetailerSync({ retailer: mockRetailer, now, apiUrl })).resolves.not.toThrow();

            // The error is logged in getIngestionStatsPayload, not recoverRetailerSync
            expect(logger.error).toHaveBeenCalledWith(
                `Failed to get ingestion stats payload for ${mockRetailer.domain}`,
                {
                    error: JSON.stringify(error),
                },
            );
            expect(RetailerSyncJob.trigger).not.toHaveBeenCalled();
        });
    });

    describe('runInternal', () => {
        const mockEnv = {
            CLOUDSHELF_API_URL: 'https://api.cloudshelf.com',
        };

        const mockEntityManager = {
            find: jest.fn(),
        } as unknown as EntityManager;

        const mockRetailers = [
            { id: 'retailer1', domain: 'test1.com', status: RetailerStatus.ACTIVE } as RetailerEntity,
            { id: 'retailer2', domain: 'test2.com', status: RetailerStatus.ACTIVE } as RetailerEntity,
            { id: 'retailer3', domain: 'test3.com', status: RetailerStatus.ACTIVE } as RetailerEntity,
            { id: 'retailer4', domain: 'test4.com', status: RetailerStatus.ACTIVE } as RetailerEntity,
            { id: 'retailer5', domain: 'test5.com', status: RetailerStatus.ACTIVE } as RetailerEntity,
            { id: 'retailer6', domain: 'test6.com', status: RetailerStatus.ACTIVE } as RetailerEntity,
            { id: 'retailer7', domain: 'test7.com', status: RetailerStatus.ACTIVE } as RetailerEntity,
        ];

        const currentRunId = 'current-run-id';

        beforeEach(() => {
            (getEnvConfig as jest.Mock).mockReturnValue(mockEnv);
            (getDbForTrigger as jest.Mock).mockResolvedValue(mockEntityManager);
            (mockEntityManager.find as jest.Mock).mockResolvedValue(mockRetailers);
            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockResolvedValue({
                lastIngestionDataDate: new Date().toISOString(),
                lastReportedCatalogStatsForProducts: {
                    reportedAt: new Date().toISOString(),
                    asExpected: true,
                },
            });
            (RetailerSyncJob.trigger as jest.Mock).mockResolvedValue(undefined);
            (logger.trace as jest.Mock).mockImplementation((message, fn) => {
                if (typeof fn === 'function') {
                    return fn();
                }
            });
            (logger.info as jest.Mock).mockClear();
            (runs.list as jest.Mock).mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    // Default: no runs to cancel
                },
            }));
            (runs.cancel as jest.Mock).mockResolvedValue(undefined);
        });

        it('should cancel previous DELAYED runs that do not match the current runId', async () => {
            const previousRun1 = { id: 'previous-run-1' };
            const previousRun2 = { id: 'previous-run-2' };

            (runs.list as jest.Mock).mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    yield previousRun1;
                    yield previousRun2;
                },
            }));

            await runInternal({ runId: currentRunId });

            // Verify runs.list was called with DELAYED status and taskIdentifier
            expect(runs.list).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: ['DELAYED'],
                    taskIdentifier: expect.any(Array),
                }),
            );
            expect(runs.cancel).toHaveBeenCalledWith('previous-run-1');
            expect(runs.cancel).toHaveBeenCalledWith('previous-run-2');
            expect(logger.info).toHaveBeenCalledWith('Cancelling previous scheduled retailer sync recovery job: previous-run-1');
            expect(logger.info).toHaveBeenCalledWith('Cancelling previous scheduled retailer sync recovery job: previous-run-2');
        });

        it('should not cancel the current run', async () => {
            (runs.list as jest.Mock).mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    yield { id: currentRunId };
                },
            }));

            await runInternal({ runId: currentRunId });

            expect(runs.list).toHaveBeenCalled();
            expect(runs.cancel).not.toHaveBeenCalled();
            expect(logger.info).not.toHaveBeenCalledWith(
                expect.stringContaining(`Cancelling previous scheduled retailer sync recovery job: ${currentRunId}`),
            );
        });

        it('should process retailers after checking for previous runs', async () => {
            (runs.list as jest.Mock).mockImplementation(() => ({
                [Symbol.asyncIterator]: async function* () {
                    yield { id: 'previous-run-1' };
                },
            }));

            await runInternal({ runId: currentRunId });

            expect(runs.cancel).toHaveBeenCalledWith('previous-run-1');
            expect(getEnvConfig).toHaveBeenCalled();
            expect(getDbForTrigger).toHaveBeenCalled();
            expect(mockEntityManager.find).toHaveBeenCalledWith(RetailerEntity, {
                status: RetailerStatus.ACTIVE,
            });
            // Should still process retailers after cancellation check
            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).toHaveBeenCalledTimes(7);
        });

        it('should process all retailers in batches of 5', async () => {
            await runInternal({ runId: currentRunId });

            expect(getEnvConfig).toHaveBeenCalled();
            expect(getDbForTrigger).toHaveBeenCalled();
            expect(mockEntityManager.find).toHaveBeenCalledWith(RetailerEntity, {
                status: RetailerStatus.ACTIVE,
            });
            // Should process 7 retailers in 2 batches (5 + 2)
            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).toHaveBeenCalledTimes(7);
        });

        it('should handle empty retailers list', async () => {
            (mockEntityManager.find as jest.Mock).mockResolvedValue([]);

            await runInternal({ runId: currentRunId });

            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).not.toHaveBeenCalled();
        });

        it('should process retailers concurrently within batches', async () => {
            const callOrder: string[] = [];
            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock).mockImplementation((apiUrl, domain) => {
                callOrder.push(domain);
                return Promise.resolve({
                    lastIngestionDataDate: new Date().toISOString(),
                    lastReportedCatalogStatsForProducts: {
                        reportedAt: new Date().toISOString(),
                        asExpected: true,
                    },
                });
            });

            await runInternal({ runId: currentRunId });

            // First batch should process 5 retailers concurrently
            // The exact order may vary, but all should be called
            expect(callOrder.length).toBe(7);
            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).toHaveBeenCalledTimes(7);
        });

        it('should handle errors in individual retailer recovery gracefully', async () => {
            (CloudshelfApiProductUtils.getSyncStatsForShopify as jest.Mock)
                .mockRejectedValueOnce(new Error('Error for retailer1'))
                .mockResolvedValueOnce({
                    lastIngestionDataDate: new Date().toISOString(),
                    lastReportedCatalogStatsForProducts: {
                        reportedAt: new Date().toISOString(),
                        asExpected: true,
                    },
                });

            await expect(runInternal({ runId: currentRunId })).resolves.not.toThrow();

            // Should still process other retailers even if one fails
            expect(CloudshelfApiProductUtils.getSyncStatsForShopify).toHaveBeenCalledTimes(7);
        });
    });
});

import { OrganisationStatus, SyncStage } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { CloudshelfApiAuthUtils } from '../cloudshelf.api.auth.util';
import { CloudshelfApiOrganisationUtils } from '../cloudshelf.api.organisation.util';
import { LogsInterface } from 'src/modules/cloudshelf/logs.interface';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';

jest.mock('src/modules/cloudshelf/cloudshelf.api.auth.util');

describe('CloudshelfApiOrganisationUtils', () => {
    const apiUrl = 'https://api.example.com';
    const domainName = 'test-domain.com';

    let logs: LogsInterface;
    let logMessages: { error: any[]; info: any[]; warn: any[] };

    beforeEach(() => {
        jest.clearAllMocks();
        logMessages = { error: [], info: [], warn: [] };
        logs = {
            error: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
        };
        // Remove invalid spyOn usage and instead mock the module's method directly
        (CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient as jest.Mock).mockResolvedValue({
            query: jest.fn().mockResolvedValue({
                errors: undefined,
                data: { organisationSyncStatusByDomain: { status: OrganisationStatus.Active } },
            }),
        });
    });

    describe('getOrganisationStatusByDomain', () => {
        it('should throw if organisationStatusByDomainQuery.errors is set', async () => {
            // Patch getCloudshelfAPIApolloClient to return a client with .query that returns errors
            const mockQuery = jest.fn().mockResolvedValue({
                errors: ['Some error'],
                data: {},
            });
            (CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient as jest.Mock).mockResolvedValue({
                query: mockQuery,
            });

            await expect(
                CloudshelfApiOrganisationUtils.getOrganisationStatusByDomain({
                    apiUrl,
                    domainName,
                    logs,
                }),
            ).rejects.toThrow('Failed to get organisation status by domain');
        });

        it('should return organisationSyncStatusByDomain if no errors', async () => {
            const expectedStatus = { status: OrganisationStatus.Active };
            const mockQuery = jest.fn().mockResolvedValue({
                errors: undefined,
                data: { organisationSyncStatusByDomain: expectedStatus },
            });
            (CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient as jest.Mock).mockResolvedValue({
                query: mockQuery,
            });

            const result = await CloudshelfApiOrganisationUtils.getOrganisationStatusByDomain({
                apiUrl,
                domainName,
                logs,
            });

            expect(result).toEqual(expectedStatus);
        });

        it('should log and throw if an error is thrown', async () => {
            (CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient as jest.Mock).mockImplementation(() => {
                throw new Error('Apollo error');
            });

            await expect(
                CloudshelfApiOrganisationUtils.getOrganisationStatusByDomain({
                    apiUrl,
                    domainName,
                    logs,
                }),
            ).rejects.toThrow('Apollo error');

            expect(logs.error).toHaveBeenCalledWith(
                expect.stringContaining('Error in getOrganisationStatusByDomain'),
                expect.any(Error),
            );
        });
    });

    describe('checkAndExitIfOrganisationIsNotActive', () => {
        it('should call callbackIfActive if status is Active', async () => {
            const callbackIfActive = jest.fn();
            jest.spyOn(CloudshelfApiOrganisationUtils, 'getOrganisationStatusByDomain').mockResolvedValue({
                status: OrganisationStatus.Active,
            } as any);

            await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
                apiUrl,
                domainName,
                logs,
                callbackIfActive,
                location: 'test-location',
            });

            expect(callbackIfActive).toHaveBeenCalled();
        });

        it('should not call callbackIfActive if status is not Active', async () => {
            const callbackIfActive = jest.fn();
            jest.spyOn(CloudshelfApiOrganisationUtils, 'getOrganisationStatusByDomain').mockResolvedValue({
                status: OrganisationStatus.Idle,
            } as any);

            await CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
                apiUrl,
                domainName,
                logs,
                callbackIfActive,
                location: 'test-location',
            });

            expect(callbackIfActive).not.toHaveBeenCalled();
            expect(logs.info).toHaveBeenCalledWith(
                expect.stringContaining('Organisation test-domain.com is not active'),
            );
        });

        it('should log and throw if getOrganisationStatusByDomain throws', async () => {
            const callbackIfActive = jest.fn();
            jest.spyOn(CloudshelfApiOrganisationUtils, 'getOrganisationStatusByDomain').mockRejectedValue(
                new Error('fail'),
            );

            await expect(
                CloudshelfApiOrganisationUtils.checkAndExitIfOrganisationIsNotActive({
                    apiUrl,
                    domainName,
                    logs,
                    callbackIfActive,
                    location: 'test-location',
                }),
            ).rejects.toThrow('fail');

            expect(logs.error).toHaveBeenCalledWith(
                expect.stringContaining('Error in checkAndExitIfOrganisationIsNotActive'),
                expect.any(Error),
            );
        });
    });

    describe('failOrganisationSync', () => {
        it('should call setOrganisationSyncStatus with SyncStage.Failed', async () => {
            const setOrganisationSyncStatusSpy = jest
                .spyOn(CloudshelfApiOrganisationUtils, 'setOrganisationSyncStatus')
                .mockResolvedValue(undefined);

            await CloudshelfApiOrganisationUtils.failOrganisationSync({
                apiUrl,
                domainName,
                logs,
            });

            expect(setOrganisationSyncStatusSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiUrl,
                    retailer: expect.objectContaining({ domain: domainName }),
                    logs,
                    syncStage: SyncStage.Failed,
                }),
            );
        });

        it('should log error if setOrganisationSyncStatus throws', async () => {
            jest.spyOn(CloudshelfApiOrganisationUtils, 'setOrganisationSyncStatus').mockRejectedValue(
                new Error('fail'),
            );

            await CloudshelfApiOrganisationUtils.failOrganisationSync({
                apiUrl,
                domainName,
                logs,
            });

            expect(logs.error).toHaveBeenCalledWith(
                expect.stringContaining('Error in failOrganisationSync'),
                expect.any(Error),
            );
        });
    });
});

import { OrganisationStatus, SyncStage } from 'src/graphql/cloudshelf/generated/cloudshelf';
import { LogsInterface } from 'src/modules/cloudshelf/logs.interface';
import { RetailerEntity } from 'src/modules/retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from '../cloudshelf.api.auth.util';
import { CloudshelfApiOrganisationUtils } from '../cloudshelf.api.organisation.util';

jest.mock('src/modules/cloudshelf/cloudshelf.api.auth.util');

describe('CloudshelfApiOrganisationUtils - setOrganisationSyncStatus', () => {
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

    it('should call authedClient.mutate with correct arguments', async () => {
        const mockMutate = jest.fn().mockResolvedValue({
            errors: undefined,
            data: {},
        });
        (CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient as jest.Mock).mockResolvedValue({
            mutate: mockMutate,
        });

        const retailer = { domain: domainName } as RetailerEntity;
        await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
            apiUrl,
            retailer,
            logs,
            syncStage: SyncStage.ProcessProductGroups,
        });

        expect(CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient).toHaveBeenCalledWith(apiUrl, domainName, logs);
        expect(mockMutate).toHaveBeenCalledWith(
            expect.objectContaining({
                mutation: expect.anything(),
                variables: {
                    input: {
                        domainName: domainName,
                        syncStage: SyncStage.ProcessProductGroups,
                    },
                },
            }),
        );
    });

    it('should log error if setOrganisationSyncStatusMutation.errors is set', async () => {
        const mockMutate = jest.fn().mockResolvedValue({
            errors: ['Some error'],
            data: {},
        });
        (CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient as jest.Mock).mockResolvedValue({
            mutate: mockMutate,
        });

        const retailer = { domain: domainName } as RetailerEntity;
        await CloudshelfApiOrganisationUtils.setOrganisationSyncStatus({
            apiUrl,
            retailer,
            logs,
            syncStage: SyncStage.Failed,
        });

        expect(logs.error).toHaveBeenCalledWith(expect.stringContaining('Failed to set organisation sync status'));
    });
});

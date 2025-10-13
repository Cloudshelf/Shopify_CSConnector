import {
    OrganisationStatus,
    OrganisationSyncStatusByDomainDocument,
    OrganisationSyncStatusByDomainQuery,
    OrganisationSyncStatusByDomainQueryVariables,
    SetOrganisationClosedDocument,
    SetOrganisationClosedMutation,
    SetOrganisationClosedMutationVariables,
    SetOrganisationSyncStatusDocument,
    SetOrganisationSyncStatusMutation,
    SetOrganisationSyncStatusMutationVariables,
    SyncStage,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiOrganisationUtils {
    static async setOrganisationSyncStatus({
        apiUrl,
        retailer,
        logs,
        syncStage,
    }: {
        apiUrl: string;
        retailer: RetailerEntity;
        logs?: LogsInterface;
        syncStage: SyncStage;
    }): Promise<void> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, retailer.domain, logs);

        const setOrganisationSyncStatusMutation = await authedClient.mutate<
            SetOrganisationSyncStatusMutation,
            SetOrganisationSyncStatusMutationVariables
        >({
            mutation: SetOrganisationSyncStatusDocument,
            variables: {
                domainName: retailer.domain,
                syncStage,
            },
        });

        if (setOrganisationSyncStatusMutation.errors) {
            logs?.error?.(`Failed to set organisation sync status ${retailer.domain}`);
            return;
        }
    }

    static async setOrganisationClosed({
        apiUrl,
        retailer,
        logs,
    }: {
        apiUrl: string;
        retailer: RetailerEntity;
        logs?: LogsInterface;
    }): Promise<void> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, retailer.domain, logs);

        const setOrganisationClosedMutation = await authedClient.mutate<
            SetOrganisationClosedMutation,
            SetOrganisationClosedMutationVariables
        >({
            mutation: SetOrganisationClosedDocument,
            variables: {
                domainName: retailer.domain,
                closed,
            },
        });

        if (setOrganisationClosedMutation.errors) {
            logs?.error?.(`Failed to set organisation sync status ${retailer.domain}`);
            return;
        }
    }

    static async getOrganisationStatusByDomain({
        apiUrl,
        domainName,
        logs,
    }: {
        apiUrl: string;
        domainName: string;
        logs?: LogsInterface;
    }): Promise<OrganisationSyncStatusByDomainQuery['organisationSyncStatusByDomain']> {
        try {
            const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domainName, logs);

            const organisationStatusByDomainQuery = await authedClient.query<
                OrganisationSyncStatusByDomainQuery,
                OrganisationSyncStatusByDomainQueryVariables
            >({
                query: OrganisationSyncStatusByDomainDocument,
                variables: { domainName },
                fetchPolicy: 'no-cache',
            });

            if (organisationStatusByDomainQuery.errors) {
                logs?.error?.(`Failed to get organisation status by domain ${domainName}`);
                throw new Error(`Failed to get organisation status by domain ${domainName}`);
            }

            return organisationStatusByDomainQuery.data.organisationSyncStatusByDomain;
        } catch (error) {
            logs?.error(`Error in getOrganisationStatusByDomain - ${domainName}`, error);
            throw error;
        }
    }

    static async failOrganisationSync({
        apiUrl,
        domainName,
        logs,
    }: {
        apiUrl: string;
        domainName: string;
        logs?: LogsInterface;
    }): Promise<void> {
        try {
            await this.setOrganisationSyncStatus({
                apiUrl,
                retailer: { domain: domainName } as RetailerEntity,
                logs,
                syncStage: SyncStage.Failed,
            });
        } catch (error) {
            logs?.error(`Error in failOrganisationSync - ${domainName}`, error);
        }
    }
}

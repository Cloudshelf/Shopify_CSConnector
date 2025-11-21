import {
    OrganisationSyncRecoveryReason,
    OrganisationSyncStatusByDomainDocument,
    OrganisationSyncStatusByDomainQuery,
    OrganisationSyncStatusByDomainQueryVariables,
    OrganisationSyncUpdateReason,
    SyncStage,
    UpdateOrganisationSyncStatusDocument,
    UpdateOrganisationSyncStatusMutation,
    UpdateOrganisationSyncStatusMutationVariables,
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
        reason,
        recoveryReason,
    }: {
        apiUrl: string;
        retailer: RetailerEntity;
        logs?: LogsInterface;
        syncStage: SyncStage;
        reason?: OrganisationSyncUpdateReason;
        recoveryReason?: OrganisationSyncRecoveryReason;
    }): Promise<void> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, retailer.domain, logs);

        const setOrganisationSyncStatusMutation = await authedClient.mutate<
            UpdateOrganisationSyncStatusMutation,
            UpdateOrganisationSyncStatusMutationVariables
        >({
            mutation: UpdateOrganisationSyncStatusDocument,
            variables: {
                input: {
                    domainName: retailer.domain,
                    syncStage,
                    reason,
                    recoveryReason,
                },
            },
        });

        if (setOrganisationSyncStatusMutation.errors) {
            logs?.error?.(
                `Failed to set organisation sync status ${retailer.domain}, Reason: ${reason},  Recovery Reason: ${recoveryReason}`,
            );
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
        reason,
        recoveryReason,
    }: {
        apiUrl: string;
        domainName: string;
        logs?: LogsInterface;
        reason?: OrganisationSyncUpdateReason;
        recoveryReason?: OrganisationSyncRecoveryReason;
    }): Promise<void> {
        try {
            await this.setOrganisationSyncStatus({
                apiUrl,
                retailer: { domain: domainName } as RetailerEntity,
                logs,
                syncStage: SyncStage.Failed,
                reason,
                recoveryReason: recoveryReason ? OrganisationSyncRecoveryReason.Error : undefined,
            });
        } catch (error) {
            logs?.error(`Error in failOrganisationSync - ${domainName}`, error);
        }
    }
}

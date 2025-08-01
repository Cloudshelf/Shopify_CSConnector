import {
    OrganisationStatus,
    OrganisationStatusByDomainDocument,
    OrganisationStatusByDomainQuery,
    OrganisationStatusByDomainQueryVariables,
    SetOrganisationIsSyncingDocument,
    SetOrganisationIsSyncingMutation,
    SetOrganisationIsSyncingMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiOrganisationUtils {
    static async setOrganisationIsSyncing({
        apiUrl,
        retailer,
        logs,
        syncing,
    }: {
        apiUrl: string;
        retailer: RetailerEntity;
        logs?: LogsInterface;
        syncing: boolean;
    }): Promise<void> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, retailer.domain, logs);

        const setOrganisationIsSyncingMutation = await authedClient.mutate<
            SetOrganisationIsSyncingMutation,
            SetOrganisationIsSyncingMutationVariables
        >({
            mutation: SetOrganisationIsSyncingDocument,
            variables: {
                domainName: retailer.domain,
                syncing,
            },
        });

        if (setOrganisationIsSyncingMutation.errors) {
            logs?.error?.(`Failed to set organisation is syncing ${retailer.domain}`);
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
    }): Promise<{ status: string; syncing: boolean }> {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domainName, logs);

        const organisationStatusByDomainQuery = await authedClient.query<
            OrganisationStatusByDomainQuery,
            OrganisationStatusByDomainQueryVariables
        >({
            query: OrganisationStatusByDomainDocument,
            variables: { domainName },
            fetchPolicy: 'no-cache',
        });

        if (organisationStatusByDomainQuery.errors) {
            logs?.error?.(`Failed to get organisation status by domain ${domainName}`);
            return { status: 'UNKNOWN', syncing: false };
        }

        return organisationStatusByDomainQuery.data.organisationStatusByDomain;
    }

    static async checkAndExitIfOrganisationIsNotActive({
        apiUrl,
        domainName,
        logs,
        func,
        location,
    }: {
        apiUrl: string;
        domainName: string;
        logs?: LogsInterface;
        func: () => Promise<void>;
        location?: string;
    }): Promise<void> {
        try {
            const { status } = await this.getOrganisationStatusByDomain({ apiUrl, domainName, logs });
            if (status !== OrganisationStatus.Active) {
                logs?.info(`Organisation ${domainName} is not active | status:${status}`);
                return;
            }

            await func();
        } catch (error) {
            logs?.error(`Error in checkAndExitIfOrganisationIsNotActive - ${location}`, error);
            throw error;
        }
    }
}

import { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import {
    ThemeInput,
    UpsertThemeDocument,
    UpsertThemeMutation,
    UpsertThemeMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiThemeUtils {
    static generateThemeInput(retailer: RetailerEntity): ThemeInput {
        return {
            id: `gid://external/ConnectorGeneratedTheme/${retailer.domain}`,
            displayName: 'Default Theme',
            logoUrl: retailer.logoUrlFromShopify,
        };
    }

    static async createTheme(apiURL: string, retailer: RetailerEntity, logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, retailer.domain, logs);

        const themeInput = this.generateThemeInput(retailer);

        const mutationTuple = await authedClient.mutate<UpsertThemeMutation, UpsertThemeMutationVariables>({
            mutation: UpsertThemeDocument,
            variables: {
                input: themeInput,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to upsert theme ${retailer.domain}`, { errors: mutationTuple.errors });
        }
    }
}

import {
    LocationInput,
    UpsertLocationsDocument,
    UpsertLocationsMutation,
    UpsertLocationsMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiLocationUtils {
    static async upsertLocations(
        apiURL: string,
        retailer: RetailerEntity,
        input: LocationInput[],
        logs?: LogsInterface,
    ) {
        logs?.info?.(`Upserting locations for ${retailer.domain}`, { input });
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiURL, retailer.domain, logs);

        const mutationTuple = await authedClient.mutate<UpsertLocationsMutation, UpsertLocationsMutationVariables>({
            mutation: UpsertLocationsDocument,
            variables: {
                input,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to upsert locations ${retailer.domain}`, { errors: mutationTuple.errors });
        }

        if ((mutationTuple.data?.upsertLocations.userErrors ?? []).length > 0) {
            logs?.error?.(`Failed to upsert locations (userErrors) ${retailer.domain}`, {
                errors: mutationTuple.data?.upsertLocations.userErrors,
            });
        }

        logs?.info?.(`Result from API`, { data: mutationTuple.data });
    }
}

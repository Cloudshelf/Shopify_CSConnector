import {
    StockLevelInput,
    UpsertStockLevelsDocument,
    UpsertStockLevelsMutation,
    UpsertStockLevelsMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiStockLevelsUtils {
    static async upsertStockLevels(apiUrl: string, domain: string, input: StockLevelInput[], logs?: LogsInterface) {
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, domain, logs);
        const mutationTuple = await authedClient.mutate<UpsertStockLevelsMutation, UpsertStockLevelsMutationVariables>({
            mutation: UpsertStockLevelsDocument,
            variables: {
                input,
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to update stock levels ${domain}`, { errors: JSON.stringify(mutationTuple.errors) });
        }
    }
}

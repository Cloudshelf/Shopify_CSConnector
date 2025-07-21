import {
    CurrencyCode,
    UpsertStoreDocument,
    UpsertStoreMutation,
    UpsertStoreMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { CryptographyUtils } from '../../utils/CryptographyUtils';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiStoreUtils {
    static async upsertStore(apiUrl: string, retailer: RetailerEntity, logs?: LogsInterface): Promise<void> {
        const timestamp = new Date().getTime().toString();
        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, retailer.domain, logs);

        let storeName = retailer.displayName ?? retailer.domain;
        if (storeName.toLowerCase().trim() === 'my store') {
            storeName = `${storeName} (${retailer.domain})`;
        }

        let curCodeToUse = CurrencyCode.Unknown;
        if (retailer.currencyCode !== null) {
            curCodeToUse = retailer.currencyCode as CurrencyCode;
        }
        const upsertStoreMutation = await authedClient.mutate<UpsertStoreMutation, UpsertStoreMutationVariables>({
            mutation: UpsertStoreDocument,
            variables: {
                input: {
                    domain: retailer.domain,
                    displayName: storeName,
                    accessToken: retailer.accessToken,
                    scopes: retailer.scopes,
                    storefrontAccessToken: retailer.storefrontToken,
                    defaultCurrencyCode: curCodeToUse,
                },
                hmac: CryptographyUtils.createHmac(retailer.accessToken, timestamp),
                nonce: timestamp,
            },
        });

        if (upsertStoreMutation.errors) {
            logs?.error?.(`Failed to upsert store ${retailer.domain}`);
            return;
        }
    }
}

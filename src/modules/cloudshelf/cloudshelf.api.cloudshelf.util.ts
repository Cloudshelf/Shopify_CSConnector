import {
    CloudshelfInput,
    UpsertCloudshelfDocument,
    UpsertCloudshelfMutation,
    UpsertCloudshelfMutationVariables,
} from '../../graphql/cloudshelf/generated/cloudshelf';
import { EntityManager } from '@mikro-orm/postgresql';
import { RetailerEntity } from '../retailer/retailer.entity';
import { CloudshelfApiAuthUtils } from './cloudshelf.api.auth.util';
import { LogsInterface } from './logs.interface';

export class CloudshelfApiCloudshelfUtils {
    static async createFirstCloudshelfIfRequired(
        apiUrl: string,
        em: EntityManager,
        retailer: RetailerEntity,
        logs?: LogsInterface,
    ) {
        //have we already created a cloudshelf? If not we need to

        if (retailer.generatedCloudshelfId !== null) {
            //we know we have already generated one
            return;
        }

        const firstCloudshelf: CloudshelfInput = {
            id: `gid://external/ConnectorGeneratedCloudshelf/${retailer.domain}`,
            randomContent: true,
            displayName: 'First Cloudshelf',
            homeFrameCallToAction: 'Touch to discover and buy',
        };

        const authedClient = await CloudshelfApiAuthUtils.getCloudshelfAPIApolloClient(apiUrl, retailer.domain, logs);
        const mutationTuple = await authedClient.mutate<UpsertCloudshelfMutation, UpsertCloudshelfMutationVariables>({
            mutation: UpsertCloudshelfDocument,
            variables: {
                input: [firstCloudshelf],
            },
        });

        if (mutationTuple.errors) {
            logs?.error?.(`Failed to upsert Cloudshelf ${retailer.domain}`, { errors: mutationTuple.errors });
        }

        const upsertedResults = mutationTuple.data?.upsertCloudshelves.cloudshelves ?? [];

        if (upsertedResults.length === 0) {
            logs?.error?.(`Failed to upsert cloudshelf ${retailer.domain}`, { errors: mutationTuple.errors });
        } else {
            const upsertedCloudshelf = upsertedResults[0];
            logs?.info?.(`Upserted cloudshelf: ${upsertedCloudshelf}`);
            retailer.generatedCloudshelfId = upsertedCloudshelf.id;
            em.persist(retailer);
            await em.flush();
        }
    }
}

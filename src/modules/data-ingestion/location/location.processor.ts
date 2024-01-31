import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ApolloQueryResult } from '@apollo/client';
import {
    KeyValuePairInput,
    LocationInput,
    MetadataInput,
    MetaimageInput,
    ProductInput,
    ProductVariantInput,
    UpsertVariantsInput,
} from '../../../graphql/cloudshelf/generated/cloudshelf';
import {
    BulkOperationStatus,
    CurrentBulkOperationDocument,
    CurrentBulkOperationQuery,
    CurrentBulkOperationQueryVariables,
    GetLocationsDocument,
    GetLocationsQuery,
    GetLocationsQueryVariables,
    LocationDetailsFragment,
} from '../../../graphql/shopifyAdmin/generated/shopifyAdmin';
import { ShopifyGraphqlUtil } from '../../shopify/shopify.graphql.util';
import * as _ from 'lodash';
import { GlobalIDUtils } from '../../../utils/GlobalIDUtils';
import { JsonLUtils } from '../../../utils/JsonLUtils';
import { MiscellaneousUtils } from '../../../utils/MiscellaneousUtils';
import { CloudshelfApiService } from '../../cloudshelf/cloudshelf.api.service';
import { NobleService } from '../../noble/noble.service';
import { LocationJobData, ProductConsumerTaskData, ProductTriggerTaskData } from '../../noble/noble.task.data';
import { NobleTaskEntity } from '../../noble/noble.task.entity';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';
import { RetailerService } from '../../retailer/retailer.service';
import { BulkOperationService } from '../bulk.operation.service';
import { BulkOperationType } from '../bulk.operation.type';
import { CollectionJobService } from '../collection/collection.job.service';
import axios from 'axios';
import { addSeconds } from 'date-fns';
import { createWriteStream, promises as fsPromises } from 'fs';
import * as stream from 'stream';
import { ulid } from 'ulid';
import { promisify } from 'util';

const finished = promisify(stream.finished);

@Injectable()
export class LocationProcessor implements OnApplicationBootstrap {
    constructor(
        private readonly bulkOperationService: BulkOperationService,
        private readonly nobleService: NobleService,
        private readonly retailerService: RetailerService,
        private readonly cloudshelfApiService: CloudshelfApiService,
    ) {}

    async onApplicationBootstrap() {
        await this.nobleService.registerQueue({
            name: 'Sync Locations',
            noTasksDelay: 1000,
            taskType: NobleTaskType.LocationSync,
            limitOnePerStore: true,
            taskDelay: 1000,
            retries: 5,
            concurrency: 1,
            processor: task => this.syncLocationsProcessor(task),
        });
    }

    async syncLocationsProcessor(task: NobleTaskEntity) {
        if (!task.organisationId) {
            throw new Error('Location Task missing organisation ID');
        }

        const retailer = await this.retailerService.getById(task.organisationId);
        if (!retailer) {
            throw new Error(`Retailer does not exist for id "${task.organisationId}"`);
        }

        await this.nobleService.addTimedLogMessage(task, `Asking shopify for locations`);
        let hasNextPage = true;
        let cursor: string | null = null;
        const shopifyLocationData: LocationDetailsFragment[] = [];
        const graphqlClient = await ShopifyGraphqlUtil.getShopifyAdminApolloClientByRetailer(retailer);

        do {
            const result: ApolloQueryResult<GetLocationsQuery> = await graphqlClient.query<
                GetLocationsQuery,
                GetLocationsQueryVariables
            >({
                query: GetLocationsDocument,
                variables: {
                    after: cursor,
                },
            });

            if (result.data.locations.edges) {
                for (const edge of result.data.locations.edges) {
                    if (edge?.node) {
                        shopifyLocationData.push(edge.node);
                    }
                }
            }

            if (result.error) {
                await this.nobleService.addTimedLogMessage(task, 'Query.Error: ' + JSON.stringify(result.error));
            }

            if (result.errors) {
                await this.nobleService.addTimedLogMessage(task, 'Query.Errors: ' + JSON.stringify(result.errors));
            }

            hasNextPage = result.data.locations.pageInfo.hasNextPage;
            cursor = result.data.locations.edges?.slice(-1)[0]?.cursor ?? null;
        } while (hasNextPage);

        if (!shopifyLocationData || shopifyLocationData.length === 0) {
            await this.nobleService.addTimedLogMessage(
                task,
                'Shopify did not return any location data, we can end the job here.',
            );
            return;
        }

        const locationInputs: LocationInput[] = [];

        for (const shopifyLocation of shopifyLocationData) {
            const csLocation: LocationInput = {
                id: GlobalIDUtils.gidConverter(shopifyLocation.id, 'ShopifyLocation'),
                displayName: shopifyLocation.name,
                address: shopifyLocation.address.formatted.join(', '),
                countryCode: MiscellaneousUtils.convertCountryCode(shopifyLocation.address.countryCode),
            };

            locationInputs.push(csLocation);
        }

        await this.nobleService.addTimedLogMessage(
            task,
            'Creating location in Cloudshelf with data: ' + JSON.stringify(locationInputs),
        );

        await this.cloudshelfApiService.upsertLocations(retailer, locationInputs);
    }
}

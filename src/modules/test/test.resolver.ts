import { Args, Query, Resolver } from '@nestjs/graphql';
import { GraphQLBoolean } from 'graphql';
import { GraphQLString } from 'graphql/type';
import { ProductJobService } from '../data-ingestion/product/product.job.service';
import { RetailerService } from '../retailer/retailer.service';
import { TestEntity } from './test.entity';
import { TestService } from './test.service';

@Resolver(() => TestEntity)
export class TestEntityResolver {
    constructor(
        private readonly testService: TestService,
        private readonly retailerService: RetailerService,
        private readonly productJobService: ProductJobService,
    ) {}
    @Query(() => TestEntity, { description: 'Returns a test entity', nullable: true })
    async testEntity(
        @Args({ name: 'id', type: () => GraphQLString })
        id: string,
    ): Promise<TestEntity | null> {
        return this.testService.findOneById(id);
    }

    @Query(() => GraphQLString, { description: 'test a product trigger', nullable: true })
    async testProductTrigger(): Promise<string> {
        const retailer = await this.retailerService.getByDomain('ashley-dev-store.myshopify.com');

        if (!retailer) {
            return 'Cannot get retailer';
        }

        await this.productJobService.scheduleTriggerJob(retailer, [], true, false);
        return 'done';
    }
}

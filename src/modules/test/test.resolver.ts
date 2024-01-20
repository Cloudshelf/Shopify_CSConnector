import { Args, Query, Resolver } from '@nestjs/graphql';
import { GraphQLString } from 'graphql/type';
import { TestEntity } from './test.entity';
import { TestService } from './test.service';

@Resolver(() => TestEntity)
export class TestEntityResolver {
    constructor(private readonly testService: TestService) {}
    @Query(() => TestEntity, { description: 'Returns a test entity', nullable: true })
    async testEntity(
        @Args({ name: 'id', type: () => GraphQLString })
        id: string,
    ): Promise<TestEntity | null> {
        return this.testService.findOneById(id);
    }
}

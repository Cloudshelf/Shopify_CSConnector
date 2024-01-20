import { Query, Resolver } from '@nestjs/graphql';
import { TestEntity } from './test.entity';

@Resolver(() => TestEntity)
export class TestEntityResolver {
    @Query(() => TestEntity, { description: 'Returns a test entity' })
    async testEntity(): Promise<TestEntity | null> {
        const testEntity = new TestEntity();
        testEntity.text = 'Hello World!';

        return testEntity;
    }
}

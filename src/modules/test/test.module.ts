import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TestEntity } from './test.entity';
import { TestEntityResolver } from './test.resolver';

@Module({
    imports: [MikroOrmModule.forFeature([TestEntity])],
    providers: [TestEntityResolver],
    controllers: [],
    exports: [],
})
export class TestModule {}

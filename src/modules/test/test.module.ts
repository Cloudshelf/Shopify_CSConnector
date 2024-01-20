import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TestEntity } from './test.entity';
import { TestEntityResolver } from './test.resolver';
import { TestService } from './test.service';

@Module({
    imports: [MikroOrmModule.forFeature([TestEntity])],
    providers: [TestService, TestEntityResolver],
    controllers: [],
    exports: [TestService],
})
export class TestModule {}

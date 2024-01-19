import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TestEntity } from './test.entity';

@Module({
    imports: [MikroOrmModule.forFeature([TestEntity])],
})
export class TestModule {}

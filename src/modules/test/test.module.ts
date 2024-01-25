import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DataIngestionModule } from '../data-ingestion/data.ingestion.module';
import { RetailerModule } from '../retailer/retailer.module';
import { TestEntity } from './test.entity';
import { TestEntityResolver } from './test.resolver';
import { TestService } from './test.service';

@Module({
    imports: [MikroOrmModule.forFeature([TestEntity]), RetailerModule, DataIngestionModule],
    providers: [TestService, TestEntityResolver],
    controllers: [],
    exports: [TestService],
})
export class TestModule {}

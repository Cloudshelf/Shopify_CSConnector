import { Module } from '@nestjs/common';
import { DataIngestionModule } from '../data-ingestion/data.ingestion.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { RetailerModule } from '../retailer/retailer.module';
import { ToolsResolver } from './tools.resolver';
import { ToolsService } from './tools.service';

@Module({
    imports: [RetailerModule, DataIngestionModule, IntegrationsModule],
    providers: [ToolsService, ToolsResolver],
    controllers: [],
    exports: [ToolsService],
})
export class ToolsModule {}

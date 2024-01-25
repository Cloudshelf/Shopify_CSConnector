import { Module } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { ToolsResolver } from './tools.resolver';
import { ToolsService } from './tools.service';

@Module({
    imports: [RetailerModule],
    providers: [ToolsService, ToolsResolver],
    controllers: [],
    exports: [ToolsService],
})
export class ToolsModule {}

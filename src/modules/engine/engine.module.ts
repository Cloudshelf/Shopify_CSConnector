import { Module } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { StockLevelsController } from './stock-level.controller';
import { StockLevelsService } from './stock-level.service';

@Module({
    imports: [RetailerModule],
    providers: [StockLevelsService],
    controllers: [StockLevelsController],
})
export class EngineModule {}

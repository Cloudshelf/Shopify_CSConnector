import { Controller, Get, Query } from '@nestjs/common';
import { RetailerEntity } from '../retailer/retailer.entity';
import { AuthenticatedEngineRequest, AuthenticatedEngineRetailer } from './guards/authenticated.request.guard';
import { StockLevelsService } from './stock-level.service';
import { Telemetry } from 'src/decorators/telemetry';

@Controller('stock-levels')
export class StockLevelsController {
    constructor(private readonly stockLevelsService: StockLevelsService) {}

    @Telemetry('controller.stock-levels.getStockLevels')
    @AuthenticatedEngineRequest()
    @Get()
    async getStockLevels(
        @AuthenticatedEngineRetailer() authedEngineRetailer: RetailerEntity,
        @Query('variant') variantId: string,
        @Query('product') productId?: string,
        @Query('location') locationId?: string,
    ): Promise<StockCheckResultPayload> {
        return this.stockLevelsService.getStockLevels(
            authedEngineRetailer,
            variantId,
            productId ?? undefined,
            locationId ?? undefined,
        );
    }
}

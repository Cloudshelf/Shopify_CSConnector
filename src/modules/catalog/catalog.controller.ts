import { Controller, Get, Query } from '@nestjs/common';
import { Telemetry } from 'src/decorators/telemetry';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
    constructor(private readonly catalogService: CatalogService) {}

    @Telemetry('controller.catalog.getCatalogId')
    @Get()
    async getCatalogId(@Query('domain') domain: string): Promise<string> {
        return this.catalogService.getCatalogIdForRetailer(domain);
    }
}

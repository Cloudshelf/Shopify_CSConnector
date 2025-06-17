import { Controller, Get, Headers, Query } from '@nestjs/common';
import { RetailerEntity } from '../retailer/retailer.entity';
import { AuthenticatedPOSRequest, AuthenticatedPOSRetailer } from './guards/authenticated.request.guard';
import { CloudshelfDraftOrdersPayload } from './payloads/CloudshelfDraftOrdersPayload';
import { POSService } from './pos.service';
import { Telemetry } from 'src/decorators/telemetry';

@Controller('pos')
export class POSController {
    constructor(private readonly posService: POSService) {
        //
    }

    @Telemetry('controller.pos.getDraftOrders')
    @AuthenticatedPOSRequest()
    @Get()
    async getDraftOrders(
        @AuthenticatedPOSRetailer() authedEngineRetailer: RetailerEntity,
        @Query('search') search?: string,
        @Query('offset') offset?: string,
    ): Promise<CloudshelfDraftOrdersPayload> {
        return this.posService.getDraftOrders(authedEngineRetailer, search, offset);

        // const result: CloudshelfDraftOrdersPayload = {
        //     items: [
        //         {
        //             node: {
        //                 id: '1',
        //                 identifier: 'test-API',
        //                 items: [
        //                     {
        //                         variantId: 41790064263328,
        //                         quantity: 1,
        //                     },
        //                 ],
        //                 properties: {
        //                     IS_TEST: 'YES',
        //                     ORDER_PLACED_BY: 'CLOUDSHELF',
        //                 },
        //             },
        //             cursor: '1',
        //         },
        //     ],
        //     pageInfo: {
        //         hasMore: false,
        //         nextPageCursor: undefined,
        //     },
        // };

        // return result;
    }
}

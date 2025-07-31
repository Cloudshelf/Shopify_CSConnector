import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Telemetry } from 'src/decorators/telemetry';
import { RequestProductsTask } from 'src/trigger/data-ingestion/product/request-products';

@Controller('api-health')
export class ApiHealthController {
    constructor(private readonly health: HealthCheckService) {}

    @Telemetry('controller.healthcheck.check')
    @Get()
    @HealthCheck()
    async check() {
        console.log('RequestProductsTask.trigger ------- api health check', {
            organisationId: '01JZMSJ7BH4BQFGMEM639FFPWA',
            fullSync: false,
        });

        await RequestProductsTask.trigger(
            {
                organisationId: '01JZMSJ7BH4BQFGMEM639FFPWA',
                fullSync: false,
            },
            {
                tags: ['test'],
            },
        );
        //TODO: Implement health checks
        return this.health.check([]);
    }

    @Telemetry('controller.healthcheck.basic')
    @Get('/basic')
    basic() {
        return 'OK';
    }
}

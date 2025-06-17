import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Telemetry } from 'src/decorators/telemetry';

@Controller('api-health')
export class ApiHealthController {
    constructor(private readonly health: HealthCheckService) {}

    @Telemetry('controller.healthcheck.check')
    @Get()
    @HealthCheck()
    check() {
        //TODO: Implement health checks
        return this.health.check([]);
    }

    @Telemetry('controller.healthcheck.basic')
    @Get('/basic')
    basic() {
        return 'OK';
    }
}

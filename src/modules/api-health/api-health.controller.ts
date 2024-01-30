import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('api-health')
export class ApiHealthController {
    constructor(private readonly health: HealthCheckService) {}

    @Get()
    @HealthCheck()
    check() {
        //TODO: Implement health checks
        return this.health.check([]);
    }
}

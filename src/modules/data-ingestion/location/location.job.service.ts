import { Injectable } from '@nestjs/common';
import { NobleService } from '../../noble/noble.service';
import { LocationJobData } from '../../noble/noble.task.data';
import { NobleTaskType } from '../../noble/noble.task.type';
import { RetailerEntity } from '../../retailer/retailer.entity';

@Injectable()
export class LocationJobService {
    constructor(private readonly nobleService: NobleService) {}

    async schedule(retailer: RetailerEntity, installSync?: boolean) {
        let prio = 1;

        if (installSync) {
            prio = 1000;
        }

        const triggerData: LocationJobData = {
            dataType: 'location',
            installSync: installSync ?? false,
        };

        await this.nobleService.scheduleTask<LocationJobData>(
            NobleTaskType.LocationSync,
            retailer.id,
            triggerData,
            prio,
            1,
        );
    }
}

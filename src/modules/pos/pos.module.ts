import { Module } from '@nestjs/common';
import { RetailerModule } from '../retailer/retailer.module';
import { POSController } from './pos.controller';
import { POSService } from './pos.service';

@Module({
    imports: [RetailerModule],
    providers: [POSService],
    controllers: [POSController],
})
export class POSModule {}

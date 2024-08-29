import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { CloudshelfModule } from '../cloudshelf/cloudshelf.module';
import { ToolsModule } from '../tools/tools.module';
import { NobleService } from './noble.service';
import { NobleTaskEntity } from './noble.task.entity';
import { NobleTaskErrorEntity } from './noble.task.error.entity';
import { NobleTaskLogEntity } from './noble.task.log.entity';
import { NobleTaskQueueResolver } from './noble.task.queue.resolver';
import { NobleTaskResolver } from './noble.task.resolver';

@Module({
    imports: [CloudshelfModule, forwardRef(() => ToolsModule)],
    providers: [NobleService, NobleTaskQueueResolver, NobleTaskResolver],
    exports: [NobleService],
})
export class NobleModule {}

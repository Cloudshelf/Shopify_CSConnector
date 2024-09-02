import { LoadStrategy, MikroORM } from '@mikro-orm/postgresql';
import { AllDatabaseEntities } from 'src/modules/database/entites';
import { buildDatabaseConfig } from 'src/modules/database/mikro-orm.config';

export let AppDataSource: MikroORM | undefined;

export const StartMikroORMForTrigger = async () => {
    try {
        AppDataSource = await MikroORM.init({
            ...buildDatabaseConfig(
                false,
                process.env.DB_HOST_FOR_TRIGGER,
                process.env.DB_PORT_FOR_TRIGGER !== undefined ? parseInt(process.env.DB_PORT_FOR_TRIGGER) : 5432,
                process.env.DB_USER_FOR_TRIGGER,
                process.env.DB_PASSWORD_FOR_TRIGGER,
                process.env.DB_DATABASE_FOR_TRIGGER,
                process.env.DB_SSL_FOR_TRIGGER === 'true',
                undefined,
                undefined,
            ),
            entities: AllDatabaseEntities,
            loadStrategy: LoadStrategy.SELECT_IN, //Joined was causing lots of slowness
            autoJoinRefsForFilters: false,
        });
    } catch (e: any) {
        console.error('Unable to build data source', e);
        throw new Error('Unable to build data source');
    }
};

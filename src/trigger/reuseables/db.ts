import { EntityManager, FlushMode, LoadStrategy, MikroORM } from '@mikro-orm/postgresql';
import { locals, logger, tasks } from '@trigger.dev/sdk';
import { AllDatabaseEntities } from '../../modules/database/entities';
import { buildDatabaseConfig } from '../../modules/database/mikro-orm.config';

const DbLocal = locals.create<EntityManager | undefined>('db');

export function getDbForTrigger() {
    const appDataSource = locals.getOrThrow(DbLocal);

    if (!appDataSource) {
        logger.error(`AppDataSource is not set`);
        throw new Error(`AppDataSource is not set`);
    }

    return appDataSource;
}

tasks.middleware('db', async ({ ctx, payload, next, task }) => {
    if (locals.get(DbLocal) === undefined) {
        const mikro = await StartMikroORMForTrigger();
        const db = locals.set(DbLocal, mikro);
    }

    await next();
});

export const StartMikroORMForTrigger = async () => {
    try {
        const builtConfig = buildDatabaseConfig(
            false,
            process.env.DB_HOST_FOR_TRIGGER,
            process.env.DB_PORT_FOR_TRIGGER !== undefined ? parseInt(process.env.DB_PORT_FOR_TRIGGER) : 5432,
            process.env.DB_USER_FOR_TRIGGER,
            process.env.DB_PASSWORD_FOR_TRIGGER,
            process.env.DB_DATABASE_FOR_TRIGGER,
            process.env.DB_SSL_FOR_TRIGGER === 'true',
            undefined,
            undefined,
        );

        const mikro = await MikroORM.init({
            ...builtConfig,
            entities: AllDatabaseEntities,
            loadStrategy: LoadStrategy.SELECT_IN, //Joined was causing lots of slowness
            autoJoinRefsForFilters: false,
        });

        const forkedMikro = mikro.em.fork({
            flushMode: FlushMode.COMMIT,
        });

        return forkedMikro;
    } catch (e: any) {
        console.error('Unable to build data source', e);
        throw new Error('Unable to build data source');
    }
};

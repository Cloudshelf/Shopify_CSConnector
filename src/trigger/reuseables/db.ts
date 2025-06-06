import { LoadStrategy, MikroORM } from '@mikro-orm/postgresql';
import { AllDatabaseEntities } from '../../modules/database/entities';
import { buildDatabaseConfig } from '../../modules/database/mikro-orm.config';
import { locals, tasks } from '@trigger.dev/sdk';

const DbLocal = locals.create<MikroORM | undefined>('db');

export function getDbForTrigger() {
    return locals.getOrThrow(DbLocal);
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

        return mikro;
    } catch (e: any) {
        console.error('Unable to build data source', e);
        throw new Error('Unable to build data source');
    }
};

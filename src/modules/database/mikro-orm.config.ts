import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

export function buildDatabaseConfig(
    debug: boolean | undefined,
    host: string | undefined,
    port: number | undefined,
    user: string | undefined,
    password: string | undefined,
    dbName: string | undefined,
    ssl: boolean | undefined,
    maxPoolSize: number | undefined,
    idleTimeoutMillis: number | undefined,
) {
    const highligher = new SqlHighlighter();
    if (process.env.MIKRO_ORM_CLI_CONFIG !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const dotenv = require('dotenv-flow');
        dotenv.load([process.env.ENV_FILE_PATH]);

        debug = process.env.DATABASE_DEBUG_LOGGING === 'true';
        host = process.env.DATABASE_HOST;
        port = parseInt(process.env.DATABASE_PORT ?? '');
        user = process.env.DATABASE_USERNAME;
        password = process.env.DATABASE_PASSWORD;
        dbName = process.env.DATABASE_SCHEMA;
        ssl = process.env.DATABASE_SSL === 'true';
    }

    return defineConfig({
        entities: process.env.MIKRO_ORM_CLI_CONFIG ? ['./dist/**/*.entity.js'] : undefined,
        strict: true,
        forceUtcTimezone: true,
        debug,
        host,
        port,
        user,
        password,
        dbName,
        driverOptions: {
            connection: {
                ssl,
            },
        },
        migrations: {
            path: 'dist/modules/database/migrations',
            pathTs: 'src/modules/database/migrations',
            transactional: true,
            allOrNothing: true,
        },
        pool: {
            min: 5,
            max: maxPoolSize,
            idleTimeoutMillis: idleTimeoutMillis,
        },
        highlighter: debug ? highligher : undefined,
        extensions: [Migrator],
    });
}

export default buildDatabaseConfig(
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
);

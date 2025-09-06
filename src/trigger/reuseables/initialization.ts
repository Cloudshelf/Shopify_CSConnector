import { EntityManager, MikroORM } from '@mikro-orm/postgresql';
import { locals, logger, tasks } from '@trigger.dev/sdk';
import { StartMikroORMForTrigger } from './db';
import { RetailerSyncEnvironmentConfig, validateEnvironmentForRetailerSync } from './env_validation';

// Create locals for both environment config and database
const EnvConfigLocal = locals.create<RetailerSyncEnvironmentConfig | undefined>('env-config');
const MikroORMLocal = locals.create<MikroORM | undefined>('mikro-orm');
const DbLocal = locals.create<EntityManager | undefined>('db');

// Single initialization middleware that handles both env and db
tasks.middleware('initialization', async ({ next }) => {
    // Step 1: Validate and set environment configuration
    const env = validateEnvironmentForRetailerSync();
    locals.set(EnvConfigLocal, env);
    logger.info('[Initialization]: Environment validated and stored');

    // Step 2: Initialize database connection
    let mikro: MikroORM | undefined;
    let em: EntityManager | undefined;

    try {
        const dbResult = await StartMikroORMForTrigger();
        mikro = dbResult.mikro;
        em = dbResult.em;
        locals.set(MikroORMLocal, mikro);
        locals.set(DbLocal, em);
        logger.info('[Initialization]: Database connection established');
    } catch (error) {
        logger.error('[Initialization]: Failed to initialize database', { error });
        throw error;
    }

    try {
        // Execute the task
        await next();
    } finally {
        // Cleanup in reverse order
        const mikroInstance = locals.get(MikroORMLocal);
        if (mikroInstance) {
            await mikroInstance.close();
            logger.info('[Initialization]: Database connection closed');
        }

        // Clear all locals
        locals.set(MikroORMLocal, undefined);
        locals.set(DbLocal, undefined);
        locals.set(EnvConfigLocal, undefined);
    }
});

// Handle connection management during wait states
tasks.onWait('initialization', async () => {
    const em = locals.get(DbLocal);
    if (em) {
        const connection = em.getConnection();
        const isConnected = await connection.isConnected();
        if (isConnected) {
            await connection.close();
            logger.log('[Initialization]: Database connection closed (onWait)');
        }
    }
});

tasks.onResume('initialization', async () => {
    const em = locals.get(DbLocal);
    if (em) {
        const connection = em.getConnection();
        const isConnected = await connection.isConnected();
        if (!isConnected) {
            await connection.connect();
            logger.log('[Initialization]: Database connection re-established (onResume)');
        }
    }
});

// Helper function to get environment configuration
export function getEnvConfig(): RetailerSyncEnvironmentConfig {
    const env = locals.getOrThrow(EnvConfigLocal);

    if (!env) {
        logger.error('Environment configuration is not set');
        throw new Error('Environment configuration is not set');
    }

    return env;
}

// Helper function to get database entity manager
export function getDbForTrigger(): EntityManager {
    const appDataSource = locals.getOrThrow(DbLocal);

    if (!appDataSource) {
        logger.error('Database connection is not set');
        throw new Error('Database connection is not set');
    }

    return appDataSource;
}

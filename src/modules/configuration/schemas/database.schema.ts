import * as Joi from 'joi';

const DEFAULT_POOLSIZE = 40;
const DEFAULT_IDLE_TIMEOUT = 10000;

export const databaseSchema = {
    DATABASE_HOST: Joi.string().hostname().required(),
    DATABASE_PORT: Joi.number().port().required(),
    DATABASE_SCHEMA: Joi.string().required(),
    DATABASE_USERNAME: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_DEBUG_LOGGING: Joi.boolean().default(false),
    DATABASE_SSL: Joi.boolean().default(true),
    DATABASE_POOLSIZE: Joi.number().default(DEFAULT_POOLSIZE),
    DATABASE_IDLE_TIMEOUT: Joi.number().default(DEFAULT_IDLE_TIMEOUT),
};

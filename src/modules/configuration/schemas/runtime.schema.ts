import * as Joi from 'joi';

export const runtimeSchema = {
    PORT: Joi.number().required(),
    RELEASE_TYPE: Joi.string().valid('development_local', 'development', 'production').required(),
    PACKAGE_VERSION: Joi.string().required(),
    HOST: Joi.string().hostname().required(),
    TRIGGER_SECRET_KEY: Joi.string().required(),
};

import * as Joi from 'joi';

export const runtimeSchema = {
    PORT: Joi.number().required(),
    RELEASE_TYPE: Joi.string().valid('development_local', 'development', 'release_candidate', 'production').required(),
    HOST: Joi.string().hostname().required(),
};

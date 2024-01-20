import * as Joi from 'joi';

export const sentrySchema = {
    SENTRY_DNS: Joi.string().required(),
    SENTRY_DEBUG: Joi.boolean().optional().default(false),
    SENTRY_AUTH_TOKEN: Joi.string().required(),
};

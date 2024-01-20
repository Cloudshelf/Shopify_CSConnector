import * as Joi from 'joi';

export const sentrySchema = {
    SENTRY_DNS: Joi.string().required(),
    SENTRY_AUTH_TOKEN: Joi.string().required(),
};

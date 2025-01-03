import * as Joi from 'joi';

export const shopifySchema = {
    SHOPIFY_API_KEY: Joi.string().required(),
    SHOPIFY_API_SECRET_KEY: Joi.string().required(),
    SHOPIFY_IGNORE_UPDATE_WEBHOOKS: Joi.boolean().optional().default(false),
};

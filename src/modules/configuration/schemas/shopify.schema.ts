import * as Joi from 'joi';

export const shopifySchema = {
    SHOPIFY_API_KEY: Joi.string().required(),
    SHOPIFY_API_SECRET_KEY: Joi.string().required(),
    SHOPIFY_IGNORE_UPDATE_WEBHOOKS: Joi.boolean().optional().default(false),
    // Retry configuration
    SHOPIFY_RETRY_MAX_ATTEMPTS: Joi.number().optional().default(5).min(1).max(10),
    SHOPIFY_RETRY_INITIAL_DELAY: Joi.number().optional().default(2000).min(100).max(10000),
    SHOPIFY_RETRY_MAX_DELAY: Joi.number().optional().default(240000).min(1000).max(300000), // max 5 minutes
    SHOPIFY_RETRY_MULTIPLIER: Joi.number().optional().default(2).min(1.1).max(5),
    SHOPIFY_RETRY_JITTER: Joi.boolean().optional().default(true),
};

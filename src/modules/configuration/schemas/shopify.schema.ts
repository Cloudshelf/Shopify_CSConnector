import * as Joi from 'joi';

export const shopifySchema = {
    SHOPIFY_APP_SLUG: Joi.string().required(),
    SHOPIFY_SUBSCRIPTION_TEST_MODE: Joi.boolean().required(),
};

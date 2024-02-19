import * as Joi from 'joi';

export const cloudflareSchema = {
    CLOUDFLARE_R2_PUBLIC_ENDPOINT: Joi.string().required(),
    CLOUDFLARE_R2_ENDPOINT: Joi.string().required(),
    CLOUDFLARE_R2_ACCESS_KEY_ID: Joi.string().required(),
    CLOUDFLARE_R2_ACCESS_KEY_SECRET: Joi.string().required(),
};

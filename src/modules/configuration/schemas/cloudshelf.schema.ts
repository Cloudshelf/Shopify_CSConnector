import * as Joi from 'joi';

export const cloudshelfSchema = {
    CLOUDSHELF_API_URL: Joi.string().required(),
    CLOUDSHELF_MANAGER_URL: Joi.string().required(),
    CLOUDSHELF_API_HMAC_KEY: Joi.string().required(),
    CLOUDSHELF_MANAGER_ACCESS_TOKEN: Joi.string().required(),
    CLOUDSHELF_NOBLE_ACCESS_TOKEN: Joi.string().required(),
};

import * as Joi from 'joi';

export const cloudshelfSchema = {
    CLOUDSHELF_API_URL: Joi.string().required(),
    CLOUDSHELF_MANAGER_URL: Joi.string().required(),
};

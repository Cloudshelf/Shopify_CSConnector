import * as Joi from 'joi';

export const axiomSchema = {
    AXIOM_TOKEN: Joi.string().required(),
    AXIOM_DATASET: Joi.string().required(),
    AXIOM_ORG: Joi.string().required(),
};

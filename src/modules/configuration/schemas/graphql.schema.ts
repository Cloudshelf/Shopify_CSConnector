import * as Joi from 'joi';

export const graphqlSchema = {
    GRAPHQL_SCHEMA_PATH: Joi.string().optional(),
    GRAPHQL_URL_PATH: Joi.string().optional(),
};

import * as Joi from 'joi';
import { databaseSchema } from './database.schema';
import { runtimeSchema } from './runtime.schema';
import { shopifySchema } from './shopify.schema';

export const configurationSchema = Joi.object({
    ...runtimeSchema,
    ...databaseSchema,
    ...shopifySchema,
});

import * as Joi from 'joi';
import { graphqlSchema } from './graphql.schema';
import { axiomSchema } from './axiom.schema';
import { cloudflareSchema } from './cloudflare.schema';
import { cloudshelfSchema } from './cloudshelf.schema';
import { databaseSchema } from './database.schema';
import { runtimeSchema } from './runtime.schema';
import { shopifySchema } from './shopify.schema';
import { slackSchema } from './slack.schema';

export const configurationSchema = Joi.object({
    ...runtimeSchema,
    ...databaseSchema,
    ...shopifySchema,
    ...graphqlSchema,
    ...slackSchema,
    ...cloudshelfSchema,
    ...cloudflareSchema,
    ...axiomSchema,
});

export const triggerConfigurationSchema = Joi.object({});

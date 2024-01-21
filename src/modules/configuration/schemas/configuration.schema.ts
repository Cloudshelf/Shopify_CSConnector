import * as Joi from 'joi';
import { graphqlSchema } from './graphql.schema';
import { databaseSchema } from './database.schema';
import { runtimeSchema } from './runtime.schema';
import { sentrySchema } from './sentry.schema';
import { shopifySchema } from './shopify.schema';
import { slackSchema } from './slack.schema';

export const configurationSchema = Joi.object({
    ...runtimeSchema,
    ...databaseSchema,
    ...shopifySchema,
    ...graphqlSchema,
    ...sentrySchema,
    ...slackSchema,
});

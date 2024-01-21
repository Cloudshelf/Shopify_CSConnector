import * as Joi from 'joi';

export const slackSchema = {
    SLACK_TOKEN: Joi.string().required(),
    SLACK_GENERAL_NOTIFICATION_CHANNEL: Joi.string().required(),
    SLACK_HEALTH_NOTIFICATION_CHANNEL: Joi.string().required(),
};

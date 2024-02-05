import { Entity, Enum, Index, Property } from '@mikro-orm/core';
import { BaseEntity } from '../database/abstract-entities/entity.base';
import { WebhookQueuedDataActionType } from './webhook.queued.data.action.type';
import { WebhookQueuedDataContentType } from './webhook.queued.data.content.type';

@Entity()
export class WebhookQueuedData extends BaseEntity {
    constructor() {
        super();
    }

    @Index()
    @Property({ type: 'text' })
    domain!: string;

    @Property({ type: 'text' })
    content!: string;

    @Enum({ items: () => WebhookQueuedDataActionType })
    actionType!: WebhookQueuedDataActionType;

    @Enum({ items: () => WebhookQueuedDataContentType })
    contentType!: WebhookQueuedDataContentType;
}

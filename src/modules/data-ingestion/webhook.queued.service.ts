import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { WebhookQueuedDataActionType } from './webhook.queued.data.action.type';
import { WebhookQueuedDataContentType } from './webhook.queued.data.content.type';
import { WebhookQueuedData } from './webhook.queued.data.entity';

@Injectable()
export class WebhookQueuedService {
    constructor(private readonly entityManager: EntityManager) {}

    async queue(
        domain: string,
        content: string,
        contentType: WebhookQueuedDataContentType,
        actionType: WebhookQueuedDataActionType,
    ) {
        const now = new Date();
        const queued = this.entityManager.create(WebhookQueuedData, {
            createdAt: now,
            updatedAt: now,
            domain,
            content,
            contentType,
            actionType,
        });

        await this.entityManager.persistAndFlush(queued);
    }

    async getAllByDomainAndTypeAndAction(
        domain: string,
        contentType: WebhookQueuedDataContentType,
        actionType: WebhookQueuedDataActionType,
    ) {
        return this.entityManager.find(WebhookQueuedData, {
            domain,
            contentType,
            actionType,
        });
    }

    async delete(queuedWebhooks: WebhookQueuedData[]) {
        await this.entityManager.removeAndFlush(queuedWebhooks);
    }
}

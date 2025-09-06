import { ListRunsQueryParams } from '@trigger.dev/core/v3';

export const TRIGGER_RUNS_STATUSES: ListRunsQueryParams['status'][] = [
    'PENDING_VERSION',
    'DELAYED',
    'EXECUTING',
    'WAITING',
    'QUEUED',
];

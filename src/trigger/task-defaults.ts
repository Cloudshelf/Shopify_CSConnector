export interface TaskDefaults {
    machineSize: string;
    maxDuration: number; // seconds
}

export const TASK_DEFAULTS: Record<string, TaskDefaults> = {
    'retailer-sync-job': { machineSize: 'small-2x', maxDuration: 1800 },
    'process-order': { machineSize: 'small-1x', maxDuration: 900 },
};

import { queue } from '@trigger.dev/sdk';

export const CreateSafetySyncsQueue = queue({
    name: 'create-safety-sync-queue',
    concurrencyLimit: 1,
});

export const ReportSyncIssuesQueue = queue({
    name: 'report-sync-issues-queue',
    concurrencyLimit: 1,
});

export const IngestionQueue = queue({
    name: 'ingestion',
    concurrencyLimit: 1,
});

export const OrderProcessingQueue = queue({
    name: 'order-processing',
    concurrencyLimit: 1,
});

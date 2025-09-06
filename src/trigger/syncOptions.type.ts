export enum SyncStyle {
    FULL = 'full',
    PARTIAL = 'partial',
}

export type SyncOptions = {
    style: SyncStyle;
    changesSince?: Date;
};

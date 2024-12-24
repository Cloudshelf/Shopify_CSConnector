export interface LogsInterface {
    info: (logMessage: string, ...args: any[]) => Promise<void> | void;
    warn: (logMessage: string, ...args: any[]) => Promise<void> | void;
    error: (logMessage: string, ...args: any[]) => Promise<void> | void;
}

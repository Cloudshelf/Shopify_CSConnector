import { logger } from '@trigger.dev/sdk';

export function getLoggerHelper() {
    return {
        info: (logMessage: string, ...args: any[]) => logger.info(logMessage, ...args),
        warn: (logMessage: string, ...args: any[]) => logger.warn(logMessage, ...args),
        error: (logMessage: string, ...args: any[]) => logger.error(logMessage, ...args),
    };
}

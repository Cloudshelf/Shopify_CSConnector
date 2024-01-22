import { registerEnumType } from '@nestjs/graphql';

export enum NobleHealthStatus {
    OK = 'OK',
    DEGRADED = 'DEGRADED',
    ERROR = 'ERROR',
}

registerEnumType(NobleHealthStatus, {
    name: 'NobleHealthStatus',
});

import { registerEnumType } from '@nestjs/graphql';

export enum NobleTaskType {
    Debug = 'DEBUG',
    DebugError = 'DEBUGERROR',
}

registerEnumType(NobleTaskType, {
    name: 'NobleTaskType',
});

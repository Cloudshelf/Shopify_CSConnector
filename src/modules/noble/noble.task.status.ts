import { registerEnumType } from '@nestjs/graphql';

export enum NobleTaskStatus {
    All,
    Pending,
    InProgress,
    Complete,
    Failed,
}

registerEnumType(NobleTaskStatus, {
    name: 'NobleTaskStatus',
});

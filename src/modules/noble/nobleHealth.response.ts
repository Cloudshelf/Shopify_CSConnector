import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { GraphQLInt } from 'graphql';

export enum NobleHealthStatus {
    OK = 'OK',
    DEGRADED = 'DEGRADED',
    ERROR = 'ERROR',
}

registerEnumType(NobleHealthStatus, {
    name: 'NobleHealthStatus',
});

@ObjectType()
export class NobleHealth {
    @Field(() => NobleHealthStatus)
    status!: NobleHealthStatus;

    @Field(() => GraphQLInt)
    numberOfRetailersSyncErrors!: number;

    @Field(() => GraphQLInt)
    numberOfJobsCompletedInTheLastHour!: number;

    @Field(() => GraphQLInt)
    numberOfJobsFailedInTheLastHour!: number;

    @Field(() => GraphQLInt)
    numberOfJobsAddedInTheLastHour!: number;
}

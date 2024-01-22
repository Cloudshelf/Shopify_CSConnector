import { Field, ObjectType, createUnionType } from '@nestjs/graphql';
import { GraphQLString } from 'graphql/type';
import { Embeddable, Property, types } from '@mikro-orm/core';

@ObjectType()
@Embeddable({ abstract: true, discriminatorColumn: 'dataType' })
export abstract class NobleTaskData {
    @Property({ type: 'text' })
    @Field(() => GraphQLString)
    dataType: string;
}

@ObjectType()
@Embeddable({ discriminatorValue: 'debug' })
export class DebugJobData extends NobleTaskData {
    @Property({ type: types.text })
    @Field(() => DebugJobData)
    debugText: string;
}

@ObjectType()
@Embeddable({ discriminatorValue: 'debug-error' })
export class DebugErrorJobData extends NobleTaskData {}

export type JobDataUnion = DebugJobData | DebugErrorJobData;
export const NobleTaskDataUnion = createUnionType({
    name: 'NobleTaskDataUnion',
    types: () => [DebugJobData, DebugErrorJobData],
    resolveType(value) {
        if (value.dataType === undefined) {
            return null;
        } else {
            if (value.dataType === 'debug') {
                return DebugJobData;
            }
            if (value.dataType === 'debug-errir') {
                return DebugErrorJobData;
            }
        }
        return null;
    },
});

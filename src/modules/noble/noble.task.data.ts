import { Field, ObjectType, createUnionType } from '@nestjs/graphql';
import { GraphQLBase } from '@apollo/client/react/hoc/hoc-utils';
import { GraphQLBoolean } from 'graphql';
import { GraphQLString } from 'graphql/type';
import { Embeddable, Property, types } from '@mikro-orm/core';

@ObjectType()
@Embeddable({ abstract: true, discriminatorColumn: 'dataType' })
export abstract class NobleTaskData {
    constructor() {
        this.installSync = false;
    }

    @Property({ type: 'text' })
    @Field(() => GraphQLString)
    dataType: string;

    @Property({ type: 'text', nullable: true })
    @Field(() => GraphQLString, { nullable: true })
    reason?: string;

    @Property({ type: types.boolean, default: false })
    @Field(() => GraphQLBoolean, { defaultValue: false })
    installSync: boolean;
}

@ObjectType()
@Embeddable({ discriminatorValue: 'debug' })
export class DebugJobData extends NobleTaskData {
    @Property({ type: types.text })
    @Field(() => GraphQLString)
    debugText: string;
}

@ObjectType()
@Embeddable({ discriminatorValue: 'debug-error' })
export class DebugErrorJobData extends NobleTaskData {}

@ObjectType()
@Embeddable({ discriminatorValue: 'product-trigger' })
export class ProductTriggerTaskData extends NobleTaskData {
    @Property({ type: types.array })
    @Field(() => [GraphQLString])
    productIds: string[];
}

@ObjectType()
@Embeddable({ discriminatorValue: 'collection-consumer' })
export class CollectionConsumerTaskData extends NobleTaskData {
    @Property({ type: types.text })
    @Field(() => GraphQLString)
    remoteBulkOperationId: string;
}

@ObjectType()
@Embeddable({ discriminatorValue: 'collection-trigger' })
export class CollectionTriggerTaskData extends NobleTaskData {
    @Property({ type: types.array })
    @Field(() => [GraphQLString])
    collectionIds: string[];
}

@ObjectType()
@Embeddable({ discriminatorValue: 'product-consumer' })
export class ProductConsumerTaskData extends NobleTaskData {
    @Property({ type: types.text })
    @Field(() => GraphQLString)
    remoteBulkOperationId: string;
}

export type JobDataUnion =
    | DebugJobData
    | DebugErrorJobData
    | ProductTriggerTaskData
    | ProductConsumerTaskData
    | CollectionTriggerTaskData
    | CollectionConsumerTaskData;

export const NobleTaskDataUnion = createUnionType({
    name: 'NobleTaskDataUnion',
    types: () => [
        DebugJobData,
        DebugErrorJobData,
        ProductTriggerTaskData,
        ProductConsumerTaskData,
        CollectionTriggerTaskData,
        CollectionConsumerTaskData,
    ],
    resolveType(value) {
        if (value.dataType === undefined) {
            return null;
        } else {
            if (value.dataType === 'debug') {
                return DebugJobData;
            }
            if (value.dataType === 'debug-error') {
                return DebugErrorJobData;
            }
            if (value.dataType === 'product-trigger') {
                return ProductTriggerTaskData;
            }
            if (value.dataType === 'product-consumer') {
                return ProductConsumerTaskData;
            }
            if (value.dataType === 'collection-trigger') {
                return CollectionTriggerTaskData;
            }
            if (value.dataType === 'collection-consumer') {
                return CollectionConsumerTaskData;
            }
        }
        return null;
    },
});

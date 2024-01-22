import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import * as Relay from 'graphql-relay';

export type Pagination = {
    limit?: number;
    offset?: number;
};

export interface ConnectionWithCount<T> extends Relay.Connection<T> {
    totalCount: number;
}

/**
 * We have to return any here because of a limitation with Typescript inference.
 */
export default function ConnectionType<T>(type: Type<T>): any {
    const { name } = type;
    @ObjectType(`${name}Edge`, { isAbstract: true })
    class Edge implements Relay.Edge<T> {
        public name = `${name}Edge`;

        @Field({ nullable: true, description: 'The cursor for provided node to be used in pagination' })
        public cursor!: Relay.ConnectionCursor;

        @Field(() => type, { nullable: true, description: `The ${name} entity` })
        public node!: T;
    }

    @ObjectType(`${name}PageInfo`, { isAbstract: true })
    class PageInfo implements Relay.PageInfo {
        @Field({ nullable: true, description: 'The cursor for the first node in the page' })
        public startCursor!: Relay.ConnectionCursor;

        @Field({ nullable: true, description: 'The cursor for the last node in the page' })
        public endCursor!: Relay.ConnectionCursor;

        @Field(() => Boolean, { description: 'Whether or not there is a previous page of data' })
        public hasPreviousPage!: boolean;

        @Field(() => Boolean, { description: 'Whether or not there is a another page of data' })
        public hasNextPage!: boolean;
    }

    @ObjectType(`${name}Connection`, { isAbstract: true })
    class Connection implements ConnectionWithCount<T> {
        public name = `${name}Connection`;

        @Field(() => Int, { description: 'The total number of items available' })
        public totalCount!: number;

        @Field(() => [Edge], { nullable: true })
        public edges!: Edge[];

        @Field(() => PageInfo, { nullable: true })
        public pageInfo!: PageInfo;
    }
    return Connection;
}

import { BadRequestException } from '@nestjs/common';
import { ArgsType, Field, Int } from '@nestjs/graphql';
import { ConnectionArguments, ConnectionCursor, fromGlobalId } from 'graphql-relay';
import { Pagination } from './pagination.relay.types';

export enum PaginationType {
    FORWARD = 'forward',
    BACKWARD = 'backward',
    NONE = 'none',
}

type PaginationInformation =
    | { type: PaginationType.FORWARD; after?: string; first: number }
    | { type: PaginationType.BACKWARD; before?: string; last: number }
    | { type: PaginationType.NONE };

const getId = (cursor: ConnectionCursor): number => {
    return parseInt(fromGlobalId(cursor).id, 10);
};
const nextId = (cursor: ConnectionCursor): number => {
    return getId(cursor) + 1;
};

function extractPaginationInformation(args: PaginationArgs): PaginationInformation {
    const { first = 0, last = 0, after, before } = args;

    const isForwardPaging = first > 0 || after !== undefined;
    const isBackwardPaging = last > 0 || before !== undefined;
    if (isForwardPaging && isBackwardPaging) {
        throw new BadRequestException('Relay pagination cannot be forwards AND backwards!');
    }

    if (isForwardPaging) {
        if (before) {
            throw new BadRequestException('Forward pagination should not be used with before.');
        }
        if (first < 0) {
            throw new BadRequestException('First should be a positive integer.');
        }
        return { type: PaginationType.FORWARD, after, first };
    } else if (isBackwardPaging) {
        if (after) {
            throw new BadRequestException('Backward pagination should not be used with after.');
        }
        if (last < 0) {
            throw new BadRequestException('Last should be a positive integer.');
        }
        if (last > 0 && !before) {
            throw new BadRequestException('The before cursor must be provided for backward pagination.');
        }
        return { type: PaginationType.BACKWARD, before, last };
    }
    return { type: PaginationType.NONE };
}

export function buildPagination(args: PaginationArgs): Pagination {
    const paginationInfo = extractPaginationInformation(args);
    switch (paginationInfo.type) {
        case PaginationType.FORWARD: {
            let offset = paginationInfo.after ? nextId(paginationInfo.after) : 0;
            if (isNaN(offset)) {
                offset = 0;
            }
            return {
                limit: paginationInfo.first,
                offset,
            };
        }
        case PaginationType.BACKWARD: {
            const { last, before } = paginationInfo;
            let limit = last;
            let offset = before ? getId(before) - last : 0;

            if (isNaN(offset)) {
                offset = 0;
            }

            if (offset < 0) {
                limit = Math.max(last + offset, 0);
                offset = 0;
            }

            return { offset, limit };
        }
        default:
            return {};
    }
}

@ArgsType()
export default class PaginationArgs implements ConnectionArguments {
    @Field({ nullable: true, description: 'Pagination before this cursor' })
    public before?: ConnectionCursor;

    @Field({ nullable: true, description: 'Paginate after this cursor' })
    public after?: ConnectionCursor;

    @Field(() => Int, { nullable: true, description: 'The number of entities to receive using forwards pagination' })
    public first?: number;

    @Field(() => Int, { nullable: true, description: 'The number of entities to receive using backwards pagination' })
    public last?: number;
}

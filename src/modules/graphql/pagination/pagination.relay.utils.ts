import { connectionFromArraySlice } from 'graphql-relay';
import PaginationArgs, { buildPagination } from './pagination.relay.args';
import { ConnectionWithCount } from './pagination.relay.types';

interface ArraySliceMetaInfo {
    sliceStart: number;
    arrayLength: number;
}

export function connectionWithTotalCountFromArraySlice<T>(
    arraySlice: ReadonlyArray<T>,
    args: PaginationArgs,
    { arrayLength = 0, sliceStart = 0 }: Partial<ArraySliceMetaInfo>,
): ConnectionWithCount<T> {
    const { limit = 0 } = buildPagination(args);
    const connection = {
        totalCount: arrayLength,
        ...connectionFromArraySlice<T>(arraySlice, args, { arrayLength, sliceStart }),
    };

    // See https://github.com/graphql/graphql-relay-js/issues/58 for why this is needed to support
    // bi-directional navigation.
    if (sliceStart > 0) {
        connection.pageInfo.hasPreviousPage = true;
    }
    if (sliceStart + limit < arrayLength) {
        connection.pageInfo.hasNextPage = true;
    }
    return connection;
}

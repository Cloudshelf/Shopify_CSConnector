import { ApolloLink, FetchResult, NextLink, Operation } from '@apollo/client/core';
import { LogsInterface } from './logs.interface';

export function createResponseLoggingLink(logs?: LogsInterface): ApolloLink {
    return new ApolloLink((operation: Operation, forward: NextLink) => {
        return forward(operation).map((response: FetchResult) => {
            const context = operation.getContext();
            const uri = context.response?.url;
            const requestId = context.response?.headers?.get('x-request-id');

            logs?.info?.(`Cloudshelf API Request:`, {
                url: uri,
                requestId: requestId,
            });

            return response;
        });
    });
}

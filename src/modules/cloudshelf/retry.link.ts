import { ApolloLink, NextLink, Operation } from '@apollo/client/core';
import { LogsInterface } from './logs.interface';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function createRetryLink(
    maxRetries: number = 3,
    retryDelay: number = 5000,
    logs?: LogsInterface,
): ApolloLink {
    return new ApolloLink((operation: Operation, forward: NextLink) => {
        let attempt = 0;

        const executeOperation = async (): Promise<any> => {
            try {
                const result = await forward(operation).toPromise();
                return result;
            } catch (error: any) {
                attempt++;
                
                // Check if it's a 502 error and we haven't exceeded max retries
                const is502Error = error?.networkError?.statusCode === 502 || 
                                  error?.response?.status === 502 ||
                                  (error?.message && error.message.includes('502'));

                if (is502Error && attempt < maxRetries) {
                    logs?.warn?.(`502 error on attempt ${attempt}, retrying in ${retryDelay}ms...`, {
                        operation: operation.operationName,
                        error: error.message,
                        attempt,
                        maxRetries,
                    });
                    
                    await sleep(retryDelay);
                    return executeOperation();
                } else {
                    // Re-throw the error if it's not a 502 or we've exceeded max retries
                    if (is502Error && attempt >= maxRetries) {
                        logs?.error?.(`502 error after ${maxRetries} retries, giving up`, {
                            operation: operation.operationName,
                            error: error.message,
                            attempt,
                        });
                    }
                    throw error;
                }
            }
        };

        return executeOperation();
    });
}
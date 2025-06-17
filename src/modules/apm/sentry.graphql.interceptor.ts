// import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
// import { GqlArgumentsHost, GqlContextType, GqlExecutionContext } from '@nestjs/graphql';
// import * as Sentry from '@sentry/node';
// import { Observable, catchError, finalize, tap } from 'rxjs';
// import '@sentry/tracing';
// import { Context } from '../graphql/graphql.context';

// export class SentryGqlInterceptor implements NestInterceptor {
//     intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//         if (context.getType<GqlContextType>() !== 'graphql') {
//             return next.handle();
//         }

//         const ctx = GqlExecutionContext.create(context);
//         const graphQLContext: Context = context.getArgByIndex(2) as Context;
//         const request = graphQLContext.req;

//         const args = ctx.getArgs<GqlArgumentsHost>();
//         const b = ctx.getInfo();
//         const name = `${b.fieldName}.${b.operation.operation}`;

//         const sentryScope = Sentry.getCurrentHub().getScope();
//         let transaction = sentryScope.getTransaction();

//         transaction = Sentry.startTransaction({
//             op: 'graphql',
//             name: name,
//             data: args,
//         });

//         Sentry.getCurrentHub().configureScope(scope => {
//             scope.setSpan(transaction);

//             if ((request as any).authenticatedUser) {
//                 scope.setTag('user', (request as any).authenticatedUser.email);
//             }

//             if ((request as any).organisation) {
//                 scope.setTag('organisation', (request as any).organisation.domainName);
//             }
//         });

//         return next.handle().pipe(
//             finalize(() => {
//                 transaction?.setStatus('ok');
//                 transaction?.finish();
//                 Sentry.getCurrentHub().configureScope(scope => {
//                     scope.setTag('user', undefined);
//                     scope.setTag('organisation', undefined);
//                 });
//             }),
//             catchError(e => {
//                 transaction?.setStatus('unknown_error');
//                 transaction?.finish();
//                 Sentry.getCurrentHub().configureScope(scope => {
//                     scope.setTag('user', undefined);
//                     scope.setTag('organisation', undefined);
//                 });
//                 throw e;
//             }),
//         );
//     }
// }

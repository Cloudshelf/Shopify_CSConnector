import { ApolloDriver } from '@nestjs/apollo';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule as NestGraphQLModule } from '@nestjs/graphql';
import { ErrorTrackingPlugin } from '../apm/graphql-error-tracking.plugin';
import { graphqlSchema } from '../configuration/schemas/graphql.schema';
import { Context, IncomingMessageWithAuthCode } from './graphql.context';
import { GraphQLError, GraphQLFormattedError } from 'graphql';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';
import { IncomingMessage } from 'http';
import { join } from 'path';

@Module({})
export class GraphQLModule {
    static register(): DynamicModule {
        const graphQL = NestGraphQLModule.forRootAsync({
            driver: ApolloDriver,
            imports: [ConfigModule],
            inject: [ConfigService<typeof graphqlSchema>],
            useFactory: (configService: ConfigService<typeof graphqlSchema>) => {
                let autoSchemaFile = join(process.cwd(), 'src', 'modules', 'graphql', 'generated', 'schema.gql');
                const schemaPath = configService.get<string | undefined>('GRAPHQL_SCHEMA_PATH');
                if (schemaPath !== undefined) {
                    autoSchemaFile = schemaPath + '/schema.gql';
                }
                let urlPath = configService.get<string | undefined>('GRAPHQL_URL_PATH');
                if (urlPath === undefined) {
                    urlPath = '/graphql';
                }

                const context: Context = {};

                return {
                    path: urlPath,
                    autoSchemaFile,
                    context: ({ req }: { req: IncomingMessage }) => {
                        context.req = req;
                        return context;
                    },
                    sortSchema: true,
                    playground: false,
                    plugins: [
                        ApolloServerPluginLandingPageLocalDefault({
                            embed: true,
                        }),
                    ],
                    formatError: (err: GraphQLError) => this.formatError(err, context),
                    bodyParserConfig: false,
                };
            },
        });

        return {
            module: GraphQLModule,
            imports: [graphQL],
            providers: [ErrorTrackingPlugin],
            exports: [graphQL],
        };
    }

    private static formatError(error: GraphQLError, ctx: Context): GraphQLFormattedError {
        const msg = ctx.req as IncomingMessageWithAuthCode;
        if (msg.authCode) {
            if (msg.authCode === 401) {
                return {
                    message: 'Unauthorized',
                    extensions: {
                        code: 401,
                    },
                };
            }
            if (msg.authCode === 403) {
                return {
                    message: 'Forbidden',
                    extensions: {
                        code: 403,
                    },
                };
            }
        }

        // If in production, delete stacktrace
        if (process.env.NODE_ENV === 'production') {
            delete error.extensions?.stacktrace;
        }
        return error;
    }
}

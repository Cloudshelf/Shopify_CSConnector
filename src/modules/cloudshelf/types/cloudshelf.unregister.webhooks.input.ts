import { Field, InputType } from '@nestjs/graphql';
import { GraphQLString } from 'graphql/type';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class CloudshelfUnregisterWebhooksInput {
    @IsNotEmpty()
    @Field(() => [GraphQLString])
    domainNames: string[];
}

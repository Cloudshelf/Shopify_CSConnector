import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { GraphQLBoolean, GraphQLString } from 'graphql';
import { IsNotEmpty, IsOptional } from 'class-validator';

export enum CloudshelfSyncOrganisationReason {
    REACTIVATE = 'REACTIVATE',
}

registerEnumType(CloudshelfSyncOrganisationReason, {
    name: 'CloudshelfSyncOrganisationReason',
});

@InputType()
export class CloudshelfSyncOrganisationInput {
    @IsNotEmpty()
    @Field(() => GraphQLString)
    domainName: string;

    @IsNotEmpty()
    @Field(() => CloudshelfSyncOrganisationReason)
    reason: CloudshelfSyncOrganisationReason;

    @IsOptional()
    @Field(() => GraphQLBoolean, {
        nullable: true,
        description: 'If true, will sync all products and product groups',
        defaultValue: false,
    })
    fullSync?: boolean;
}

@InputType()
export class CloudshelfCancelOrganisationsSyncInput {
    @IsNotEmpty()
    @Field(() => [GraphQLString])
    domainNames: string[];

    @IsOptional()
    @Field(() => GraphQLBoolean, {
        nullable: true,
        description: 'If true, will mark the retailers as idle',
        defaultValue: false,
    })
    markAsIdle?: boolean;
}

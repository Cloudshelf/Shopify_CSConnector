import { Field, InputType, registerEnumType } from '@nestjs/graphql';
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
    @Field(() => String)
    domainName: string;

    @IsNotEmpty()
    @Field(() => CloudshelfSyncOrganisationReason)
    reason: CloudshelfSyncOrganisationReason;

    @IsOptional()
    @Field(() => Boolean, {
        nullable: true,
        description: 'If true, will sync all products and product groups',
        defaultValue: false,
    })
    fullSync?: boolean;
}

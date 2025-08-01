import { Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

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
}

import { Args, Query, Resolver } from '@nestjs/graphql';
import { GraphQLString } from 'graphql/type';
import { RetailerEntity } from './retailer.entity';
import { RetailerService } from './retailer.service';

@Resolver(() => RetailerEntity)
export class RetailerEntityResolver {
    constructor(private readonly retailerService: RetailerService) {}
    // @Query(() => RetailerEntity, { description: 'Returns a retailer entity', nullable: true })
    // async retailerEntity(
    //     @Args({ name: 'id', type: () => GraphQLString })
    //     id: string,
    // ): Promise<RetailerEntity | null> {
    //     return null;
    // }
}

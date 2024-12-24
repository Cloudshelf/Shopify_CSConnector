import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { OnlineAccessInfo, Session } from '@shopify/shopify-api';

@Entity({
    tableName: 'shopify_sessions',
})
export class ShopifySessionEntity extends Session {
    @PrimaryKey({ type: 'string' })
    public id: string;

    @Property()
    public shop: string;

    @Property()
    public state: string;

    @Property()
    public isOnline: boolean;

    @Property({ nullable: true, length: 1000 })
    public scope: string | undefined;

    @Property({ type: Date, nullable: true })
    public expires: Date | undefined;

    @Property({ nullable: true })
    public accessToken: string | undefined;

    @Property({ type: 'json', nullable: true })
    public onlineAccessInfo: OnlineAccessInfo | undefined;
}

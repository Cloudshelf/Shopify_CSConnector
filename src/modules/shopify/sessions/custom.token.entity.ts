import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({
    tableName: 'custom_token',
})
export class CustomTokenEntity {
    @PrimaryKey({ type: 'string' })
    public id: string;

    @Property()
    public shop: string;

    @Property({ length: 1000 })
    public token: string;
}

import { Migration } from '@mikro-orm/migrations';

export class Migration20240121115754 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'create table "retailer_entity" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "domain" text not null, "access_token" text not null, "shared_secret" text null, "storefront_token" text null, "scopes" text[] not null default \'{}\', "last_safety_sync" timestamptz null, "last_product_sync" timestamptz null, "last_product_group_sync" timestamptz null, constraint "retailer_entity_pkey" primary key ("id"));',
        );
        this.addSql('create index "retailer_entity_id_index" on "retailer_entity" ("id");');
        this.addSql('alter table "retailer_entity" add constraint "retailer_entity_domain_unique" unique ("domain");');

        this.addSql(
            'create table "shopify_sessions" ("id" varchar(255) not null, "shop" varchar(255) not null, "state" varchar(255) not null, "is_online" boolean not null, "scope" varchar(255) null, "expires" timestamptz null, "access_token" varchar(255) null, "online_access_info" jsonb null, constraint "shopify_sessions_pkey" primary key ("id"));',
        );
    }

    async down(): Promise<void> {
        this.addSql('drop table if exists "retailer_entity" cascade;');

        this.addSql('drop table if exists "shopify_sessions" cascade;');
    }
}

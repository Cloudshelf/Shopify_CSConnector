import { Migration } from '@mikro-orm/migrations';

export class Migration20240122143704 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'create table "custom_token" ("id" varchar(255) not null, "shop" varchar(255) not null, "token" varchar(1000) not null, constraint "custom_token_pkey" primary key ("id"));',
        );

        this.addSql('alter table "shopify_sessions" drop column "cloudshelf_auth_token";');
    }

    async down(): Promise<void> {
        this.addSql('drop table if exists "custom_token" cascade;');

        this.addSql('alter table "shopify_sessions" add column "cloudshelf_auth_token" varchar(1000) null;');
    }
}

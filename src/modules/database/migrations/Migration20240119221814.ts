import { Migration } from '@mikro-orm/migrations';

export class Migration20240119221814 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'create table "test_entity" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "text" text not null, constraint "test_entity_pkey" primary key ("id"));',
        );
        this.addSql('create index "test_entity_id_index" on "test_entity" ("id");');
        this.addSql('alter table "test_entity" add constraint "test_entity_text_unique" unique ("text");');
    }

    async down(): Promise<void> {
        this.addSql('drop table if exists "test_entity" cascade;');
    }
}

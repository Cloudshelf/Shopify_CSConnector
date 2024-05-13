import { Migration } from '@mikro-orm/migrations';

export class Migration20240513110738 extends Migration {

  async up(): Promise<void> {
    this.addSql('drop table if exists "webhook_queued_data" cascade;');
  }

  async down(): Promise<void> {
    this.addSql('create table "webhook_queued_data" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "domain" text not null, "content" text not null, "action_type" smallint not null, "content_type" smallint not null, constraint "webhook_queued_data_pkey" primary key ("id"));');
    this.addSql('create index "webhook_queued_data_id_index" on "webhook_queued_data" ("id");');
    this.addSql('create index "webhook_queued_data_domain_index" on "webhook_queued_data" ("domain");');
  }

}

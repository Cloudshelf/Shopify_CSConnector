import { Migration } from '@mikro-orm/migrations';

export class Migration20240125114526 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "bulk_operation" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "domain" text not null, "shopify_bulk_op_id" text not null, "data_url" text null, "started_at" timestamptz null, "ended_at" timestamptz null, "status" text not null default \'\', "type" text check ("type" in (\'ProductGroupSync\', \'ProductSync\')) not null, "explicit_ids" text[] not null default \'{}\', "install_sync" boolean not null default false, constraint "bulk_operation_pkey" primary key ("id"));');
    this.addSql('create index "bulk_operation_id_index" on "bulk_operation" ("id");');
    this.addSql('alter table "bulk_operation" add constraint "bulk_operation_shopify_bulk_op_id_unique" unique ("shopify_bulk_op_id");');

    this.addSql('alter table "noble_task" drop constraint if exists "noble_task_task_type_check";');

    this.addSql('alter table "noble_task" alter column "task_type" type text using ("task_type"::text);');
    this.addSql('alter table "noble_task" add constraint "noble_task_task_type_check" check ("task_type" in (\'DEBUG\', \'DEBUGERROR\', \'SYNC_PRODUCTS_TRIGGER\', \'SYNC_PRODUCTS\', \'SYNC_COLLECTIONS_TRIGGER\', \'SYNC_COLLECTIONS\'));');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "bulk_operation" cascade;');

    this.addSql('alter table "noble_task" drop constraint if exists "noble_task_task_type_check";');

    this.addSql('alter table "noble_task" alter column "task_type" type text using ("task_type"::text);');
    this.addSql('alter table "noble_task" add constraint "noble_task_task_type_check" check ("task_type" in (\'DEBUG\', \'DEBUGERROR\'));');
  }

}

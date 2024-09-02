import { Migration } from '@mikro-orm/migrations';

export class Migration20240902110458 extends Migration {
    override async up(): Promise<void> {
        this.addSql('alter table "noble_task_error" drop constraint "noble_task_error_task_id_foreign";');

        this.addSql('alter table "noble_task_log" drop constraint "noble_task_log_task_id_foreign";');

        this.addSql('drop table if exists "noble_task" cascade;');

        this.addSql('drop table if exists "noble_task_error" cascade;');

        this.addSql('drop table if exists "noble_task_log" cascade;');
    }

    override async down(): Promise<void> {
        this.addSql(
            'create table "noble_task" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "scheduled_start" timestamptz null, "task_type" text check ("task_type" in (\'DEBUG\', \'DEBUGERROR\', \'SYNC_PRODUCTS_TRIGGER\', \'SYNC_PRODUCTS\', \'SYNC_COLLECTIONS_TRIGGER\', \'SYNC_COLLECTIONS\', \'LOCATION_SYNC\')) not null, "data" jsonb null, "organisation_id" text null, "being_processed_by" text null, "is_complete" boolean not null default false, "retries" int not null default 0, "failed" boolean not null default false, "start_time" timestamptz null, "finish_time" timestamptz null, "priority" int not null default 0, constraint "noble_task_pkey" primary key ("id"));',
        );
        this.addSql('create index "noble_task_id_index" on "noble_task" ("id");');
        this.addSql(
            'create index "noble_task_task_type_created_at_retries_index" on "noble_task" ("task_type", "created_at", "retries");',
        );
        this.addSql(
            'create index "noble_task_organisation_id_being_processed_by_task_type_index" on "noble_task" ("organisation_id", "being_processed_by", "task_type");',
        );

        this.addSql(
            'create table "noble_task_error" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "task_id" varchar(255) null, "message" bytea not null, constraint "noble_task_error_pkey" primary key ("id"));',
        );
        this.addSql('create index "noble_task_error_id_index" on "noble_task_error" ("id");');

        this.addSql(
            'create table "noble_task_log" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "task_id" varchar(255) null, "message" bytea not null, constraint "noble_task_log_pkey" primary key ("id"));',
        );
        this.addSql('create index "noble_task_log_id_index" on "noble_task_log" ("id");');

        this.addSql(
            'alter table "noble_task_error" add constraint "noble_task_error_task_id_foreign" foreign key ("task_id") references "noble_task" ("id") on update cascade on delete set null;',
        );

        this.addSql(
            'alter table "noble_task_log" add constraint "noble_task_log_task_id_foreign" foreign key ("task_id") references "noble_task" ("id") on update cascade on delete set null;',
        );
    }
}

import { Migration } from '@mikro-orm/migrations';

export class Migration20240131152359 extends Migration {
    async up(): Promise<void> {
        this.addSql('drop table if exists "test_entity" cascade;');

        this.addSql('create index "bulk_operation_domain_index" on "bulk_operation" ("domain");');
        this.addSql(
            'create index "bulk_operation_shopify_bulk_op_id_index" on "bulk_operation" ("shopify_bulk_op_id");',
        );

        this.addSql(
            'create index "noble_task_organisation_id_being_processed_by_task_type_index" on "noble_task" ("organisation_id", "being_processed_by", "task_type");',
        );

        this.addSql('create index "retailer_entity_domain_index" on "retailer_entity" ("domain");');
    }

    async down(): Promise<void> {
        this.addSql(
            'create table "test_entity" ("id" varchar(255) not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "text" text not null, constraint "test_entity_pkey" primary key ("id"));',
        );
        this.addSql('create index "test_entity_id_index" on "test_entity" ("id");');
        this.addSql('alter table "test_entity" add constraint "test_entity_text_unique" unique ("text");');

        this.addSql('drop index "bulk_operation_domain_index";');
        this.addSql('drop index "bulk_operation_shopify_bulk_op_id_index";');

        this.addSql('drop index "noble_task_organisation_id_being_processed_by_task_type_index";');

        this.addSql('drop index "retailer_entity_domain_index";');
    }
}

import { Migration } from '@mikro-orm/migrations';

export class Migration20240514083516 extends Migration {
    async up(): Promise<void> {
        this.addSql('alter table "bulk_operation" drop column "explicit_ids";');

        this.addSql(
            'alter table "retailer_entity" add column "last_partial_sync_request_time" timestamptz null, add column "next_partial_sync_request_time" timestamptz null;',
        );
    }

    async down(): Promise<void> {
        this.addSql('alter table "bulk_operation" add column "explicit_ids" text[] not null default \'{}\';');

        this.addSql(
            'alter table "retailer_entity" drop column "last_partial_sync_request_time", drop column "next_partial_sync_request_time";',
        );
    }
}

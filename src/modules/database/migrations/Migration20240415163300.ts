import { Migration } from '@mikro-orm/migrations';

export class Migration20240415163300 extends Migration {
    async up(): Promise<void> {
        this.addSql('alter table "retailer_entity" add column "sync_error_code" text null;');
    }

    async down(): Promise<void> {
        this.addSql('alter table "retailer_entity" drop column "sync_error_code";');
    }
}

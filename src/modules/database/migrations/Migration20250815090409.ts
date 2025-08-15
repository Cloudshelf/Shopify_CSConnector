import { Migration } from '@mikro-orm/migrations';

export class Migration20250815090409 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "retailer_entity" add column "status" text not null default 'active';`);
        this.addSql(
            `alter table "retailer_entity" add constraint "retailer_entity_status_check" check ("status" in ('active', 'idle'));`,
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "retailer_entity" drop constraint if exists "retailer_entity_status_check";`);
        this.addSql(`alter table "retailer_entity" drop column if exists "status";`);
    }
}

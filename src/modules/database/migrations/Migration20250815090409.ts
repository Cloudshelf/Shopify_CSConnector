import { Migration } from '@mikro-orm/migrations';

export class Migration20250815090409 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "retailer_entity" drop constraint if exists "retailer_entity_status_check";`);

    this.addSql(`alter table "retailer_entity" alter column "status" type text using ("status"::text);`);
    this.addSql(`alter table "retailer_entity" alter column "status" set not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "retailer_entity" alter column "status" type varchar using ("status"::varchar);`);
    this.addSql(`alter table "retailer_entity" alter column "status" drop not null;`);
    this.addSql(`alter table "retailer_entity" add constraint "retailer_entity_status_check" check("status" in ('active', 'idle', 'processing'));`);
  }

}

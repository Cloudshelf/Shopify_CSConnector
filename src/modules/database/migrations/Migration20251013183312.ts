import { Migration } from '@mikro-orm/migrations';

export class Migration20251013183312 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "retailer_entity" add column "closed" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "retailer_entity" drop column "closed";`);
  }

}

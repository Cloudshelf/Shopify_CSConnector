import { Migration } from '@mikro-orm/migrations';

export class Migration20250611115916 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "retailer_entity" add column "trigger_max_duration_products" int null, add column "trigger_max_duration_product_groups" int null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "retailer_entity" drop column "trigger_max_duration_products", drop column "trigger_max_duration_product_groups";`);
  }

}

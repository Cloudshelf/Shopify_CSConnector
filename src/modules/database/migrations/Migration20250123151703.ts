import { Migration } from '@mikro-orm/migrations';

export class Migration20250123151703 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "retailer_entity" add column "trigger_machine_size_products" text null, add column "trigger_machine_size_product_groups" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "retailer_entity" drop column "trigger_machine_size_products", drop column "trigger_machine_size_product_groups";`);
  }

}

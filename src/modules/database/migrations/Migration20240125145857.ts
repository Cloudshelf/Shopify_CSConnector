import { Migration } from '@mikro-orm/migrations';

export class Migration20240125145857 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "retailer_entity" add column "logo_url_from_shopify" text null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "retailer_entity" drop column "logo_url_from_shopify";');
  }

}

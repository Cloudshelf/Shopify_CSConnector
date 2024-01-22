import { Migration } from '@mikro-orm/migrations';

export class Migration20240122115427 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "retailer_entity" add column "email" text null, add column "display_name" text null, add column "currency_code" text null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "retailer_entity" drop column "email";');
    this.addSql('alter table "retailer_entity" drop column "display_name";');
    this.addSql('alter table "retailer_entity" drop column "currency_code";');
  }

}

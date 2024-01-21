import { Migration } from '@mikro-orm/migrations';

export class Migration20240121121125 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "shopify_sessions" alter column "scope" type varchar(1000) using ("scope"::varchar(1000));');
  }

  async down(): Promise<void> {
    this.addSql('alter table "shopify_sessions" alter column "scope" type varchar(255) using ("scope"::varchar(255));');
  }

}

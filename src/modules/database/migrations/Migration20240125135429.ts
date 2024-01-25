import { Migration } from '@mikro-orm/migrations';

export class Migration20240125135429 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "retailer_entity" add column "generated_cloudshelf_id" text null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "retailer_entity" drop column "generated_cloudshelf_id";');
  }

}

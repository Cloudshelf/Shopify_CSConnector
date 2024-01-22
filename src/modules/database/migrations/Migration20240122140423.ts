import { Migration } from '@mikro-orm/migrations';

export class Migration20240122140423 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "shopify_sessions" add column "cloudshelf_auth_token" varchar(1000) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "shopify_sessions" drop column "cloudshelf_auth_token";');
  }

}

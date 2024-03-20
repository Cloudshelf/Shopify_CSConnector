import { Migration } from '@mikro-orm/migrations';

export class Migration20240320114054 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "retailer_entity" add column "last_safety_sync_completed" timestamptz null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "retailer_entity" drop column "last_safety_sync_completed";');
  }

}

import { Migration } from '@mikro-orm/migrations';

export class Migration20240320114013 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "retailer_entity" rename column "last_safety_sync" to "last_safety_sync_requested";');
  }

  async down(): Promise<void> {
    this.addSql('alter table "retailer_entity" rename column "last_safety_sync_requested" to "last_safety_sync";');
  }

}

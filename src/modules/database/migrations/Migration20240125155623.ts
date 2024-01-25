import { Migration } from '@mikro-orm/migrations';

export class Migration20240125155623 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "noble_task" drop constraint if exists "noble_task_task_type_check";');

    this.addSql('alter table "noble_task" alter column "task_type" type text using ("task_type"::text);');
    this.addSql('alter table "noble_task" add constraint "noble_task_task_type_check" check ("task_type" in (\'DEBUG\', \'DEBUGERROR\', \'SYNC_PRODUCTS_TRIGGER\', \'SYNC_PRODUCTS\', \'SYNC_COLLECTIONS_TRIGGER\', \'SYNC_COLLECTIONS\', \'LOCATION_SYNC\'));');
  }

  async down(): Promise<void> {
    this.addSql('alter table "noble_task" drop constraint if exists "noble_task_task_type_check";');

    this.addSql('alter table "noble_task" alter column "task_type" type text using ("task_type"::text);');
    this.addSql('alter table "noble_task" add constraint "noble_task_task_type_check" check ("task_type" in (\'DEBUG\', \'DEBUGERROR\', \'SYNC_PRODUCTS_TRIGGER\', \'SYNC_PRODUCTS\', \'SYNC_COLLECTIONS_TRIGGER\', \'SYNC_COLLECTIONS\'));');
  }

}

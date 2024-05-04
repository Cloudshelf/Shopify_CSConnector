import { Migration } from '@mikro-orm/migrations';

export class Migration20240504103057 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "noble_task_error" drop constraint "noble_task_error_task_id_foreign";');

    this.addSql('alter table "noble_task_error" alter column "task_id" type varchar(255) using ("task_id"::varchar(255));');
    this.addSql('alter table "noble_task_error" alter column "task_id" drop not null;');
    this.addSql('alter table "noble_task_error" add constraint "noble_task_error_task_id_foreign" foreign key ("task_id") references "noble_task" ("id") on update cascade on delete set null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "noble_task_error" drop constraint "noble_task_error_task_id_foreign";');

    this.addSql('alter table "noble_task_error" alter column "task_id" type varchar(255) using ("task_id"::varchar(255));');
    this.addSql('alter table "noble_task_error" alter column "task_id" set not null;');
    this.addSql('alter table "noble_task_error" add constraint "noble_task_error_task_id_foreign" foreign key ("task_id") references "noble_task" ("id") on update cascade;');
  }

}

import { Migration } from '@mikro-orm/migrations';

export class Migration20250226135608 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "bulk_operation" drop constraint if exists "bulk_operation_type_check";`);

    this.addSql(`alter table "bulk_operation" add column "object_count" int not null default 0;`);
    this.addSql(`alter table "bulk_operation" add constraint "bulk_operation_type_check" check("type" in ('ProductGroupSync', 'ProductSync', 'ProductGroupDeleteSync'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "bulk_operation" drop constraint if exists "bulk_operation_type_check";`);

    this.addSql(`alter table "bulk_operation" drop column "object_count";`);

    this.addSql(`alter table "bulk_operation" add constraint "bulk_operation_type_check" check("type" in ('ProductGroupSync', 'ProductSync'));`);
  }

}

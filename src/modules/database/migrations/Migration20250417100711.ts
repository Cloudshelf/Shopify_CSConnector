import { Migration } from '@mikro-orm/migrations';

export class Migration20250417100711 extends Migration {
    override async up(): Promise<void> {
        this.addSql(`alter table "bulk_operation" drop constraint if exists "bulk_operation_type_check";`);

        this.addSql(
            `alter table "bulk_operation" add constraint "bulk_operation_type_check" check("type" in ('ProductGroupSync', 'ProductSync', 'PostSync', 'ProductGroupDeleteSync'));`,
        );
    }

    override async down(): Promise<void> {
        this.addSql(`alter table "bulk_operation" drop constraint if exists "bulk_operation_type_check";`);

        this.addSql(
            `alter table "bulk_operation" add constraint "bulk_operation_type_check" check("type" in ('ProductGroupSync', 'ProductSync', 'ProductGroupDeleteSync'));`,
        );
    }
}

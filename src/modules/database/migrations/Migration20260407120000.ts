import { Migration } from '@mikro-orm/migrations';

export class Migration20260407120000 extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "retailer_entity" drop column if exists "trigger_machine_size_products", drop column if exists "trigger_machine_size_product_groups", drop column if exists "trigger_max_duration_products", drop column if exists "trigger_max_duration_product_groups";`,
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "retailer_entity" add column "trigger_machine_size_products" text null, add column "trigger_machine_size_product_groups" text null, add column "trigger_max_duration_products" int null, add column "trigger_max_duration_product_groups" int null;`,
        );
    }
}

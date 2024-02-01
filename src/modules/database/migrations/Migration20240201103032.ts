import { Migration } from '@mikro-orm/migrations';

export class Migration20240201103032 extends Migration {
    async up(): Promise<void> {
        this.addSql(
            'create index "noble_task_task_type_created_at_retries_index" on "noble_task" ("task_type", "created_at", "retries");',
        );
    }

    async down(): Promise<void> {
        this.addSql('drop index "noble_task_task_type_created_at_retries_index";');
    }
}

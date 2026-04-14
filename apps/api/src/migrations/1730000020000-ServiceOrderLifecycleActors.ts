import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceOrderLifecycleActors1730000020000
  implements MigrationInterface
{
  name = 'ServiceOrderLifecycleActors1730000020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      ADD COLUMN "created_by_user_id" uuid,
      ADD COLUMN "started_by_user_id" uuid,
      ADD COLUMN "completed_by_user_id" uuid,
      ADD COLUMN "cancelled_by_user_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      ADD CONSTRAINT "FK_erp_service_orders_created_by_user"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      ADD CONSTRAINT "FK_erp_service_orders_started_by_user"
      FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      ADD CONSTRAINT "FK_erp_service_orders_completed_by_user"
      FOREIGN KEY ("completed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      ADD CONSTRAINT "FK_erp_service_orders_cancelled_by_user"
      FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_erp_service_orders_created_by_user_id"
      ON "erp_service_orders" ("created_by_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_erp_service_orders_started_by_user_id"
      ON "erp_service_orders" ("started_by_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_erp_service_orders_completed_by_user_id"
      ON "erp_service_orders" ("completed_by_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_erp_service_orders_cancelled_by_user_id"
      ON "erp_service_orders" ("cancelled_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_erp_service_orders_cancelled_by_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_erp_service_orders_completed_by_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_erp_service_orders_started_by_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_erp_service_orders_created_by_user_id"`);

    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      DROP CONSTRAINT IF EXISTS "FK_erp_service_orders_cancelled_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      DROP CONSTRAINT IF EXISTS "FK_erp_service_orders_completed_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      DROP CONSTRAINT IF EXISTS "FK_erp_service_orders_started_by_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      DROP CONSTRAINT IF EXISTS "FK_erp_service_orders_created_by_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      DROP COLUMN "cancelled_by_user_id",
      DROP COLUMN "completed_by_user_id",
      DROP COLUMN "started_by_user_id",
      DROP COLUMN "created_by_user_id"
    `);
  }
}

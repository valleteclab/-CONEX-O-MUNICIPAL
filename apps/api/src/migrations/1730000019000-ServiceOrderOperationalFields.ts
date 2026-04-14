import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceOrderOperationalFields1730000019000
  implements MigrationInterface
{
  name = 'ServiceOrderOperationalFields1730000019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      ADD COLUMN "priority" varchar(16) NOT NULL DEFAULT 'medium',
      ADD COLUMN "service_category" varchar(80),
      ADD COLUMN "promised_for" timestamptz,
      ADD COLUMN "assigned_user_id" uuid,
      ADD COLUMN "contact_name" varchar(160),
      ADD COLUMN "contact_phone" varchar(32),
      ADD COLUMN "service_location" varchar(255),
      ADD COLUMN "service_address" jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN "diagnosis" text,
      ADD COLUMN "resolution" text,
      ADD COLUMN "checklist" jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN "started_at" timestamptz,
      ADD COLUMN "completed_at" timestamptz,
      ADD COLUMN "cancelled_at" timestamptz,
      ADD COLUMN "cancellation_reason" text
    `);

    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      ADD CONSTRAINT "FK_erp_service_orders_assigned_user"
      FOREIGN KEY ("assigned_user_id")
      REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_erp_service_orders_assigned_user_id"
      ON "erp_service_orders" ("assigned_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_erp_service_orders_assigned_user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      DROP CONSTRAINT IF EXISTS "FK_erp_service_orders_assigned_user"
    `);

    await queryRunner.query(`
      ALTER TABLE "erp_service_orders"
      DROP COLUMN "cancellation_reason",
      DROP COLUMN "cancelled_at",
      DROP COLUMN "completed_at",
      DROP COLUMN "started_at",
      DROP COLUMN "checklist",
      DROP COLUMN "resolution",
      DROP COLUMN "diagnosis",
      DROP COLUMN "service_address",
      DROP COLUMN "service_location",
      DROP COLUMN "contact_phone",
      DROP COLUMN "contact_name",
      DROP COLUMN "assigned_user_id",
      DROP COLUMN "promised_for",
      DROP COLUMN "service_category",
      DROP COLUMN "priority"
    `);
  }
}

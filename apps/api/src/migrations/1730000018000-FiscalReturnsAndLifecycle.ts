import { MigrationInterface, QueryRunner } from 'typeorm';

export class FiscalReturnsAndLifecycle1730000018000
  implements MigrationInterface
{
  name = 'FiscalReturnsAndLifecycle1730000018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_sales_orders"
      ADD COLUMN "commercial_status" varchar(24) NOT NULL DEFAULT 'draft'
    `);

    await queryRunner.query(`
      UPDATE "erp_sales_orders"
      SET "commercial_status" = "status"
    `);

    await queryRunner.query(`
      ALTER TABLE "erp_fiscal_documents"
      ADD COLUMN "purpose" varchar(16) NOT NULL DEFAULT 'sale',
      ADD COLUMN "related_document_id" uuid,
      ADD COLUMN "related_access_key" varchar(48),
      ADD COLUMN "operation_snapshot" jsonb,
      ADD COLUMN "provider_event_payload" jsonb,
      ADD COLUMN "cancel_reason" text,
      ADD COLUMN "cancel_requested_at" timestamptz,
      ADD COLUMN "cancel_authorized_at" timestamptz,
      ADD COLUMN "effect_applied_at" timestamptz
    `);

    await queryRunner.query(`
      ALTER TABLE "erp_fiscal_documents"
      ADD CONSTRAINT "FK_erp_fiscal_documents_related_document"
      FOREIGN KEY ("related_document_id")
      REFERENCES "erp_fiscal_documents"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_erp_fiscal_documents_related_document_id"
      ON "erp_fiscal_documents" ("related_document_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_erp_fiscal_documents_related_document_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_fiscal_documents"
      DROP CONSTRAINT IF EXISTS "FK_erp_fiscal_documents_related_document"
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_fiscal_documents"
      DROP COLUMN "effect_applied_at",
      DROP COLUMN "cancel_authorized_at",
      DROP COLUMN "cancel_requested_at",
      DROP COLUMN "cancel_reason",
      DROP COLUMN "provider_event_payload",
      DROP COLUMN "operation_snapshot",
      DROP COLUMN "related_access_key",
      DROP COLUMN "related_document_id",
      DROP COLUMN "purpose"
    `);
    await queryRunner.query(`
      ALTER TABLE "erp_sales_orders"
      DROP COLUMN "commercial_status"
    `);
  }
}

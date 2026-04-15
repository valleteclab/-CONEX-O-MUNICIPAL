import { MigrationInterface, QueryRunner } from 'typeorm';

export class FiscalDocumentProvider1730000021000 implements MigrationInterface {
  name = 'FiscalDocumentProvider1730000021000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_fiscal_documents"
      ADD COLUMN IF NOT EXISTS "provider" VARCHAR(20) NOT NULL DEFAULT 'plugnotas'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_fiscal_documents"
      DROP COLUMN IF EXISTS "provider"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class SalesOrderFiscalFlow1730000016000 implements MigrationInterface {
  name = 'SalesOrderFiscalFlow1730000016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_sales_orders"
      ADD COLUMN "payment_method" varchar(24),
      ADD COLUMN "fiscal_status" varchar(24) NOT NULL DEFAULT 'none',
      ADD COLUMN "fiscal_document_type" varchar(8)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_sales_orders"
      DROP COLUMN "fiscal_document_type",
      DROP COLUMN "fiscal_status",
      DROP COLUMN "payment_method"
    `);
  }
}

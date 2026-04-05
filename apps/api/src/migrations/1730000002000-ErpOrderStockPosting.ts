import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ErpOrderStockPosting1730000002000 implements MigrationInterface {
  name = 'ErpOrderStockPosting1730000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE erp_sales_orders
      ADD COLUMN IF NOT EXISTS stock_posted_at timestamptz;
    `);

    await queryRunner.query(`
      ALTER TABLE erp_purchase_orders
      ADD COLUMN IF NOT EXISTS stock_posted_at timestamptz;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE erp_sales_orders
      DROP COLUMN IF EXISTS stock_posted_at;
    `);

    await queryRunner.query(`
      ALTER TABLE erp_purchase_orders
      DROP COLUMN IF EXISTS stock_posted_at;
    `);
  }
}

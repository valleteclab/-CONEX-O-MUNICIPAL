import { readFileSync } from 'fs';
import { join } from 'path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Raiz do monorepo a partir de apps/api/src/migrations ou apps/api/dist/migrations */
function monorepoRoot(): string {
  return join(__dirname, '..', '..', '..', '..');
}

export class Baseline1730000000000 implements MigrationInterface {
  name = 'Baseline1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const path = join(monorepoRoot(), 'infra', 'docker', 'migration-baseline.sql');
    const sql = readFileSync(path, 'utf8');
    await queryRunner.query(sql);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS erp_cash_entries CASCADE;
      DROP TABLE IF EXISTS erp_accounts_payable CASCADE;
      DROP TABLE IF EXISTS erp_accounts_receivable CASCADE;
      DROP TABLE IF EXISTS erp_purchase_order_items CASCADE;
      DROP TABLE IF EXISTS erp_purchase_orders CASCADE;
      DROP TABLE IF EXISTS erp_sales_order_items CASCADE;
      DROP TABLE IF EXISTS erp_sales_orders CASCADE;
      DROP TABLE IF EXISTS erp_stock_movements CASCADE;
      DROP TABLE IF EXISTS erp_stock_balances CASCADE;
      DROP TABLE IF EXISTS erp_products CASCADE;
      DROP TABLE IF EXISTS erp_parties CASCADE;
      DROP TABLE IF EXISTS erp_stock_locations CASCADE;
      DROP TABLE IF EXISTS erp_business_users CASCADE;
      DROP TABLE IF EXISTS erp_businesses CASCADE;
      DROP TABLE IF EXISTS academy_courses CASCADE;
      DROP TABLE IF EXISTS quotation_requests CASCADE;
      DROP TABLE IF EXISTS directory_listings CASCADE;
      DROP TABLE IF EXISTS password_reset_tokens CASCADE;
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
      DROP TABLE IF EXISTS user_tenants CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS tenants CASCADE;
      DROP TABLE IF EXISTS plans CASCADE;
    `);
  }
}

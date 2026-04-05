import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ErpCatalogFiscalBase1730000001000 implements MigrationInterface {
  name = 'ErpCatalogFiscalBase1730000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE erp_products
      ADD COLUMN IF NOT EXISTS kind varchar(24) NOT NULL DEFAULT 'product',
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS barcode varchar(32),
      ADD COLUMN IF NOT EXISTS cest varchar(16),
      ADD COLUMN IF NOT EXISTS origin_code varchar(4),
      ADD COLUMN IF NOT EXISTS tax_config jsonb NOT NULL DEFAULT '{}'::jsonb;
    `);

    await queryRunner.query(`
      ALTER TABLE erp_parties
      ADD COLUMN IF NOT EXISTS legal_name varchar(255),
      ADD COLUMN IF NOT EXISTS email varchar(32),
      ADD COLUMN IF NOT EXISTS phone varchar(24),
      ADD COLUMN IF NOT EXISTS state_registration varchar(32),
      ADD COLUMN IF NOT EXISTS municipal_registration varchar(32),
      ADD COLUMN IF NOT EXISTS taxpayer_type varchar(24),
      ADD COLUMN IF NOT EXISTS notes text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE erp_products
      DROP COLUMN IF EXISTS tax_config,
      DROP COLUMN IF EXISTS origin_code,
      DROP COLUMN IF EXISTS cest,
      DROP COLUMN IF EXISTS barcode,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS kind;
    `);

    await queryRunner.query(`
      ALTER TABLE erp_parties
      DROP COLUMN IF EXISTS notes,
      DROP COLUMN IF EXISTS taxpayer_type,
      DROP COLUMN IF EXISTS municipal_registration,
      DROP COLUMN IF EXISTS state_registration,
      DROP COLUMN IF EXISTS phone,
      DROP COLUMN IF EXISTS email,
      DROP COLUMN IF EXISTS legal_name;
    `);
  }
}

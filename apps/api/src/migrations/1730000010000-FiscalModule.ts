import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FiscalModule1730000010000 implements MigrationInterface {
  name = 'FiscalModule1730000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Campos fiscais do emitente no cadastro de negócio
    await queryRunner.query(`
      ALTER TABLE erp_businesses
        ADD COLUMN IF NOT EXISTS address jsonb,
        ADD COLUMN IF NOT EXISTS inscricao_municipal varchar(32),
        ADD COLUMN IF NOT EXISTS inscricao_estadual varchar(32),
        ADD COLUMN IF NOT EXISTS tax_regime varchar(24),
        ADD COLUMN IF NOT EXISTS city_ibge_code varchar(10),
        ADD COLUMN IF NOT EXISTS fiscal_config jsonb NOT NULL DEFAULT '{}'::jsonb;
    `);

    // Tabela de documentos fiscais emitidos (NFS-e, NF-e, NFC-e)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS erp_fiscal_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        business_id uuid NOT NULL REFERENCES erp_businesses(id) ON DELETE CASCADE,
        sales_order_id uuid REFERENCES erp_sales_orders(id) ON DELETE SET NULL,
        type varchar(8) NOT NULL,
        plugnotas_id varchar(64),
        id_integracao varchar(64),
        status varchar(20) NOT NULL DEFAULT 'pending',
        numero varchar(20),
        serie varchar(10),
        chave varchar(48),
        xml_url text,
        pdf_url text,
        raw_response jsonb,
        error_message text,
        emitted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_fiscal_docs_business
        ON erp_fiscal_documents(business_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_fiscal_docs_order
        ON erp_fiscal_documents(sales_order_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_fiscal_docs_tenant
        ON erp_fiscal_documents(tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS erp_fiscal_documents;`);

    await queryRunner.query(`
      ALTER TABLE erp_businesses
        DROP COLUMN IF EXISTS fiscal_config,
        DROP COLUMN IF EXISTS city_ibge_code,
        DROP COLUMN IF EXISTS tax_regime,
        DROP COLUMN IF EXISTS inscricao_estadual,
        DROP COLUMN IF EXISTS inscricao_municipal,
        DROP COLUMN IF EXISTS address;
    `);
  }
}

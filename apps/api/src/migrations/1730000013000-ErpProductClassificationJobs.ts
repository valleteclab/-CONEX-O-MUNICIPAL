import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ErpProductClassificationJobs1730000013000
  implements MigrationInterface
{
  name = 'ErpProductClassificationJobs1730000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(120) NOT NULL UNIQUE,
        value jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS erp_product_classification_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        business_id uuid NOT NULL REFERENCES erp_businesses(id) ON DELETE CASCADE,
        requested_by_user_id uuid,
        status varchar(16) NOT NULL DEFAULT 'queued',
        filter jsonb NOT NULL DEFAULT '{}'::jsonb,
        stats jsonb NOT NULL DEFAULT '{}'::jsonb,
        result jsonb,
        error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_prod_class_jobs_business
        ON erp_product_classification_jobs(business_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_prod_class_jobs_tenant
        ON erp_product_classification_jobs(tenant_id);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_erp_prod_class_jobs_status
        ON erp_product_classification_jobs(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS erp_product_classification_jobs;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS platform_settings;`);
  }
}


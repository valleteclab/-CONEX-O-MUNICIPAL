import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformModeration1730000005000 implements MigrationInterface {
  name = 'PlatformModeration1730000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE directory_listings
        ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(24) NOT NULL DEFAULT 'pending';
    `);

    await queryRunner.query(`
      UPDATE directory_listings
      SET moderation_status = 'approved', is_published = true
      WHERE moderation_status = 'pending' OR moderation_status IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE directory_listings
        DROP CONSTRAINT IF EXISTS chk_directory_moderation;
    `);

    await queryRunner.query(`
      ALTER TABLE directory_listings
        ADD CONSTRAINT chk_directory_moderation
        CHECK (moderation_status IN ('pending','approved','rejected'));
    `);

    await queryRunner.query(`
      ALTER TABLE erp_businesses
        ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(24) NOT NULL DEFAULT 'pending';
    `);

    await queryRunner.query(`
      UPDATE erp_businesses
      SET moderation_status = 'approved', is_active = true;
    `);

    await queryRunner.query(`
      ALTER TABLE erp_businesses
        DROP CONSTRAINT IF EXISTS chk_erp_business_moderation;
    `);

    await queryRunner.query(`
      ALTER TABLE erp_businesses
        ADD CONSTRAINT chk_erp_business_moderation
        CHECK (moderation_status IN ('pending','approved','rejected'));
    `);

    const superadminHash =
      '$2b$12$8VmeAeBOTzppiyDNJkE4FuDN3FeXyn0PoDwFQoKrvCPrGt30zfO8m';

    await queryRunner.query(
      `
      INSERT INTO users (email, password_hash, full_name, role, is_active)
      VALUES (
        'superadmin@conexao.local',
        $1,
        'Super Admin Plataforma',
        'super_admin',
        true
      )
      ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
    `,
      [superadminHash],
    );

    await queryRunner.query(`
      INSERT INTO user_tenants (user_id, tenant_id, role, is_active)
      SELECT u.id, t.id, 'admin', true
      FROM users u
      CROSS JOIN tenants t
      WHERE u.email = 'superadmin@conexao.local'
        AND t.slug = 'luis-eduardo-magalhaes'
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE directory_listings DROP CONSTRAINT IF EXISTS chk_directory_moderation;
    `);
    await queryRunner.query(`
      ALTER TABLE directory_listings DROP COLUMN IF EXISTS moderation_status;
    `);
    await queryRunner.query(`
      ALTER TABLE erp_businesses DROP CONSTRAINT IF EXISTS chk_erp_business_moderation;
    `);
    await queryRunner.query(`
      ALTER TABLE erp_businesses DROP COLUMN IF EXISTS moderation_status;
    `);
  }
}

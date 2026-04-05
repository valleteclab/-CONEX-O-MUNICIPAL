import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AcademyBadges1730000008000 implements MigrationInterface {
  name = 'AcademyBadges1730000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS academy_badge_definitions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        slug VARCHAR(64) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        sort_order INT NOT NULL DEFAULT 0
      );
    `);

    await queryRunner.query(`
      INSERT INTO academy_badge_definitions (slug, title, description, sort_order)
      VALUES
        ('primeira-formacao', 'Primeira formação', 'Concluiu o primeiro curso no município.', 1),
        ('trilheiro', 'Trilheiro', 'Concluiu 3 ou mais cursos no município.', 2)
      ON CONFLICT (slug) DO NOTHING;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS academy_user_badges (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        badge_id UUID NOT NULL REFERENCES academy_badge_definitions(id) ON DELETE CASCADE,
        earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_academy_user_badge UNIQUE (user_id, tenant_id, badge_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_academy_user_badges_ut
      ON academy_user_badges (user_id, tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS academy_user_badges;`);
    await queryRunner.query(`DROP TABLE IF EXISTS academy_badge_definitions;`);
  }
}

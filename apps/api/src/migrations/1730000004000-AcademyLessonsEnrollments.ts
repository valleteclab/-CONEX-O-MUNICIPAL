import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AcademyLessonsEnrollments1730000004000 implements MigrationInterface {
  name = 'AcademyLessonsEnrollments1730000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent;`);

    await queryRunner.query(`
      ALTER TABLE academy_courses
        ADD COLUMN IF NOT EXISTS slug VARCHAR(160),
        ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS category VARCHAR(64);
    `);

    await queryRunner.query(`
      UPDATE academy_courses
      SET slug = trim(both '-' FROM regexp_replace(unaccent(lower(title)), '[^a-z0-9]+', '-', 'g'))
      WHERE slug IS NULL OR slug = '';
    `);

    await queryRunner.query(`
      UPDATE academy_courses c
      SET slug = slug || '-' || replace(substring(c.id::text, 1, 8), '-', '')
      WHERE c.id IN (
        SELECT id FROM (
          SELECT id,
            row_number() OVER (PARTITION BY tenant_id, slug ORDER BY created_at) AS rn
          FROM academy_courses
        ) x WHERE rn > 1
      );
    `);

    await queryRunner.query(`
      ALTER TABLE academy_courses ALTER COLUMN slug SET NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_academy_courses_tenant_slug
      ON academy_courses (tenant_id, slug);
    `);

    await queryRunner.query(`
      UPDATE academy_courses SET is_featured = true
      WHERE title = 'Abertura de MEI';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS academy_lessons (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        course_id UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content_md TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        duration_minutes INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_academy_lessons_course ON academy_lessons (course_id);
    `);

    await queryRunner.query(`
      INSERT INTO academy_lessons (course_id, title, content_md, sort_order, duration_minutes)
      SELECT c.id,
        'Introdução ao tema',
        'Este módulo faz parte da Academia Empresarial do município. Complete as aulas e acompanhe o progresso na área **Minhas formações**.',
        1,
        15
      FROM academy_courses c
      WHERE NOT EXISTS (SELECT 1 FROM academy_lessons l WHERE l.course_id = c.id);
    `);

    await queryRunner.query(`
      INSERT INTO academy_lessons (course_id, title, content_md, sort_order, duration_minutes)
      SELECT c.id,
        'Práticas e próximos passos',
        'Revise os conceitos e aplique no seu negócio. Em breve: materiais complementares e certificado digital.',
        2,
        15
      FROM academy_courses c
      WHERE (SELECT COUNT(*) FROM academy_lessons l WHERE l.course_id = c.id) = 1;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS academy_enrollments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        course_id UUID NOT NULL REFERENCES academy_courses(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        progress_percent INT NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_academy_enrollment_status CHECK (status IN ('active','completed')),
        CONSTRAINT uq_academy_enrollment_user_course UNIQUE (user_id, course_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_academy_enrollment_user ON academy_enrollments (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_academy_enrollment_tenant ON academy_enrollments (tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS academy_enrollments CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS academy_lessons CASCADE;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_academy_courses_tenant_slug;`);
    await queryRunner.query(`
      ALTER TABLE academy_courses
        DROP COLUMN IF EXISTS slug,
        DROP COLUMN IF EXISTS is_featured,
        DROP COLUMN IF EXISTS category;
    `);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AcademyYoutubeLiveGamification1730000007000
  implements MigrationInterface
{
  name = 'AcademyYoutubeLiveGamification1730000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE academy_lessons
        ADD COLUMN IF NOT EXISTS video_url TEXT,
        ADD COLUMN IF NOT EXISTS lesson_kind VARCHAR(24) NOT NULL DEFAULT 'youtube';
    `);

    await queryRunner.query(`
      ALTER TABLE academy_lessons
        DROP CONSTRAINT IF EXISTS chk_academy_lesson_kind;
    `);

    await queryRunner.query(`
      ALTER TABLE academy_lessons
        ADD CONSTRAINT chk_academy_lesson_kind
        CHECK (lesson_kind IN ('youtube','text','live_ref'));
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS academy_lesson_progress (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id UUID NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_academy_lesson_progress_user_lesson UNIQUE (user_id, lesson_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_academy_lp_user ON academy_lesson_progress (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_academy_lp_lesson ON academy_lesson_progress (lesson_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS academy_live_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        course_id UUID REFERENCES academy_courses(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ,
        meeting_url TEXT NOT NULL,
        is_published BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_academy_live_tenant_starts
      ON academy_live_sessions (tenant_id, starts_at);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS academy_user_gamification (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        points INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_academy_gamification_user_tenant UNIQUE (user_id, tenant_id)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS academy_user_gamification;`);
    await queryRunner.query(`DROP TABLE IF EXISTS academy_live_sessions;`);
    await queryRunner.query(`DROP TABLE IF EXISTS academy_lesson_progress;`);
    await queryRunner.query(`
      ALTER TABLE academy_lessons DROP CONSTRAINT IF EXISTS chk_academy_lesson_kind;
    `);
    await queryRunner.query(`
      ALTER TABLE academy_lessons
        DROP COLUMN IF EXISTS video_url,
        DROP COLUMN IF EXISTS lesson_kind;
    `);
  }
}

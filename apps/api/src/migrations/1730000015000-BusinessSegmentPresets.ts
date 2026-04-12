import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessSegmentPresets1730000015000 implements MigrationInterface {
  name = 'BusinessSegmentPresets1730000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_businesses"
      ADD COLUMN "segment_preset_key" varchar(40),
      ADD COLUMN "segment_preset_version" integer,
      ADD COLUMN "segment_onboarding_answers" jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN "segment_preset_applied" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "erp_businesses"
      DROP COLUMN "segment_preset_applied",
      DROP COLUMN "segment_onboarding_answers",
      DROP COLUMN "segment_preset_version",
      DROP COLUMN "segment_preset_key"
    `);
  }
}

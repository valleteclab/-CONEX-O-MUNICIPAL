import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthEmailVerification1730000003000 implements MigrationInterface {
  name = 'AuthEmailVerification1730000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_email_verification_user
      ON email_verification_tokens (user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_email_verification_user;`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_verification_tokens;`);
  }
}

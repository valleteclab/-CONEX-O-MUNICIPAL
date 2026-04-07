import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PublicBusinessSignupAndIbgeCities1730000012000 implements MigrationInterface {
  name = 'PublicBusinessSignupAndIbgeCities1730000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE erp_businesses
      ADD COLUMN IF NOT EXISTS responsible_name varchar(200),
      ADD COLUMN IF NOT EXISTS responsible_email varchar(255),
      ADD COLUMN IF NOT EXISTS responsible_phone varchar(32);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ibge_cities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(10) NOT NULL,
        state char(2) NOT NULL,
        name varchar(160) NOT NULL,
        normalized_name varchar(160) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS IDX_ibge_cities_code ON ibge_cities (code);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_ibge_cities_state_name ON ibge_cities (state, name);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_ibge_cities_state_name;`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_ibge_cities_code;`);
    await queryRunner.query(`DROP TABLE IF EXISTS ibge_cities;`);
    await queryRunner.query(`
      ALTER TABLE erp_businesses
      DROP COLUMN IF EXISTS responsible_phone,
      DROP COLUMN IF EXISTS responsible_email,
      DROP COLUMN IF EXISTS responsible_name;
    `);
  }
}

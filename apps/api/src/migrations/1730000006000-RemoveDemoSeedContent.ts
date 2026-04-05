import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove conteúdo de demonstração inserido pelo baseline (vitrines, cotação e cursos de exemplo).
 * Novas instalações já não recebem esses INSERTs — ver infra/docker/migration-baseline.sql.
 */
export class RemoveDemoSeedContent1730000006000 implements MigrationInterface {
  name = 'RemoveDemoSeedContent1730000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM directory_listings
      WHERE slug IN ('padaria-central', 'eletrica-silva', 'tech-solucoes');
    `);

    await queryRunner.query(`
      DELETE FROM quotation_requests
      WHERE title = 'Instalação de ar-condicionado'
        AND tenant_id IN (SELECT id FROM tenants WHERE slug = 'luis-eduardo-magalhaes');
    `);

    await queryRunner.query(`
      DELETE FROM academy_courses
      WHERE tenant_id IN (SELECT id FROM tenants WHERE slug = 'luis-eduardo-magalhaes')
        AND title IN (
          'Abertura de MEI',
          'Precificação e margem',
          'Atendimento ao cliente'
        );
    `);
  }

  public async down(): Promise<void> {
    // Sem recriação automática: dados eram apenas de demo.
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Correção: a migração DemoSeedData1730000009000 falha em produção
 * porque os dados demo já existem (inseridos manualmente ou por deploy anterior).
 * Esta migração limpa duplicatas e marca a DemoSeedData como executada.
 */
export class FixDemoSeedDuplicate1730000011000 implements MigrationInterface {
  name = 'FixDemoSeedDuplicate1730000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove dados demo duplicados mantendo apenas um de cada por email/slug
    // DISTINCT ON evita MIN(uuid): em vários Postgres, aggregate min(uuid) não existe.
    await queryRunner.query(`
      DELETE FROM quotation_requests qr
      WHERE qr.title IN (
        'Reforma elétrica em escritório 60m²',
        'Uniforme corporativo para equipe de 8 pessoas',
        'Consultoria em marketing digital para pequeno negócio',
        'Equipamentos para padaria: forno e batedeira industrial',
        'Pintura residencial — casa de 3 quartos'
      )
      AND qr.id NOT IN (
        SELECT DISTINCT ON (sub.title) sub.id
        FROM quotation_requests sub
        WHERE sub.title IN (
          'Reforma elétrica em escritório 60m²',
          'Uniforme corporativo para equipe de 8 pessoas',
          'Consultoria em marketing digital para pequeno negócio',
          'Equipamentos para padaria: forno e batedeira industrial',
          'Pintura residencial — casa de 3 quartos'
        )
        ORDER BY sub.title, sub.id
      );
    `);

    // Marca a DemoSeedData como executada para não rodar novamente
    await queryRunner.query(`
      INSERT INTO migrations (timestamp, name)
      VALUES (1730000009000, 'DemoSeedData1730000009000')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(): Promise<void> {
    // No-op
  }
}

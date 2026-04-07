import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Configurações globais da plataforma (super admin).
 * Use key-value em JSONB para evoluir sem migrations frequentes.
 */
@Entity({ name: 'platform_settings' })
export class PlatformSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  key: string;

  @Column({ type: 'jsonb', default: {} })
  value: Record<string, unknown>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}


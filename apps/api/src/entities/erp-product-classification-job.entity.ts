import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ErpProductClassificationJobStatus =
  | 'queued'
  | 'running'
  | 'done'
  | 'failed';

@Entity({ name: 'erp_product_classification_jobs' })
export class ErpProductClassificationJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @Column({ name: 'requested_by_user_id', type: 'uuid', nullable: true })
  requestedByUserId: string | null;

  @Column({ type: 'varchar', length: 16, default: 'queued' })
  status: ErpProductClassificationJobStatus;

  /** Filtro/escopo solicitado pela UI */
  @Column({ type: 'jsonb', default: {} })
  filter: Record<string, unknown>;

  /** Estatísticas simples (counts) */
  @Column({ type: 'jsonb', default: {} })
  stats: Record<string, unknown>;

  /** Resultado: sugestões por produto + erros */
  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}


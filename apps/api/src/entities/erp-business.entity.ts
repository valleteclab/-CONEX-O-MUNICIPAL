import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export type ErpBusinessModerationStatus = 'pending' | 'approved' | 'rejected';

@Entity({ name: 'erp_businesses' })
export class ErpBusiness {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'trade_name', type: 'varchar', length: 255 })
  tradeName: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 255, nullable: true })
  legalName: string | null;

  @Column({ name: 'responsible_name', type: 'varchar', length: 200, nullable: true })
  responsibleName: string | null;

  @Column({ name: 'responsible_email', type: 'varchar', length: 255, nullable: true })
  responsibleEmail: string | null;

  @Column({ name: 'responsible_phone', type: 'varchar', length: 32, nullable: true })
  responsiblePhone: string | null;

  /** CNPJ/CPF alfanumérico sem máscara opcional */
  @Column({ type: 'varchar', length: 20, nullable: true })
  document: string | null;

  @Column({ name: 'moderation_status', type: 'varchar', length: 24, default: 'pending' })
  moderationStatus: ErpBusinessModerationStatus;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  /** Endereço do emitente (logradouro, numero, cep, codigoMunicipio…) */
  @Column({ type: 'jsonb', nullable: true })
  address: Record<string, string> | null;

  /** Inscrição Municipal (IM) — obrigatória para NFS-e */
  @Column({ name: 'inscricao_municipal', type: 'varchar', length: 32, nullable: true })
  inscricaoMunicipal: string | null;

  /** Inscrição Estadual (IE) */
  @Column({ name: 'inscricao_estadual', type: 'varchar', length: 32, nullable: true })
  inscricaoEstadual: string | null;

  /** Regime tributário: mei | simples_nacional | lucro_presumido | lucro_real */
  @Column({ name: 'tax_regime', type: 'varchar', length: 24, nullable: true })
  taxRegime: string | null;

  /** Código IBGE do município (default 2919207 = Luís Eduardo Magalhães – BA) */
  @Column({ name: 'city_ibge_code', type: 'varchar', length: 10, nullable: true })
  cityIbgeCode: string | null;

  /** Configuração fiscal: nfse/nfe habilitados, serviceCode, cnae, issAliquota, etc. */
  @Column({ name: 'fiscal_config', type: 'jsonb', default: '{}' })
  fiscalConfig: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

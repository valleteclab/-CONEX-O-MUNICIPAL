import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ErpBusiness } from './erp-business.entity';

export type ErpPartyType = 'customer' | 'supplier' | 'both';

@Entity({ name: 'erp_parties' })
export class ErpParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

  @Column({ type: 'varchar', length: 16 })
  type: ErpPartyType;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 255, nullable: true })
  legalName: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  document: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  phone: string | null;

  @Column({ name: 'state_registration', type: 'varchar', length: 32, nullable: true })
  stateRegistration: string | null;

  @Column({ name: 'municipal_registration', type: 'varchar', length: 32, nullable: true })
  municipalRegistration: string | null;

  @Column({ name: 'taxpayer_type', type: 'varchar', length: 24, nullable: true })
  taxpayerType: string | null;

  @Column({ type: 'jsonb', default: {} })
  address: Record<string, unknown>;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

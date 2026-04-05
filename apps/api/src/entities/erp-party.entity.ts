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

  @Column({ type: 'varchar', length: 20, nullable: true })
  document: string | null;

  @Column({ type: 'jsonb', default: {} })
  address: Record<string, unknown>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

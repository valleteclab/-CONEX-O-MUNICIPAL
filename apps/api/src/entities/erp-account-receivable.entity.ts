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
import { ErpParty } from './erp-party.entity';

export type ErpFinanceDocStatus = 'open' | 'paid' | 'cancelled';

@Entity({ name: 'erp_accounts_receivable' })
export class ErpAccountReceivable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

  @Column({ name: 'party_id', type: 'uuid' })
  partyId: string;

  @ManyToOne(() => ErpParty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'party_id' })
  party: ErpParty;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount: string;

  @Column({ length: 16, default: 'open' })
  status: ErpFinanceDocStatus;

  @Column({ name: 'link_ref', length: 32, nullable: true })
  linkRef: string | null;

  @Column({ name: 'link_id', type: 'uuid', nullable: true })
  linkId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

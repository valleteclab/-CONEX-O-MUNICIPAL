import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ErpBusiness } from './erp-business.entity';
import { ErpParty } from './erp-party.entity';
import { ErpServiceOrderItem } from './erp-service-order-item.entity';

export type ErpServiceOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

@Entity({ name: 'erp_service_orders' })
export class ErpServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: ErpBusiness;

  @Column({ name: 'party_id', type: 'uuid', nullable: true })
  partyId!: string | null;

  @ManyToOne(() => ErpParty, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'party_id' })
  party!: ErpParty | null;

  @Column({ name: 'quote_id', type: 'uuid', nullable: true })
  quoteId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status!: ErpServiceOrderStatus;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor!: Date | null;

  @Column({ name: 'assigned_to', type: 'varchar', length: 160, nullable: true })
  assignedTo!: string | null;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 18,
    scale: 4,
    default: 0,
  })
  totalAmount!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'stock_posted_at', type: 'timestamptz', nullable: true })
  stockPostedAt!: Date | null;

  @Column({ name: 'receivable_posted_at', type: 'timestamptz', nullable: true })
  receivablePostedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ErpServiceOrderItem, (item) => item.serviceOrder)
  items!: ErpServiceOrderItem[];
}

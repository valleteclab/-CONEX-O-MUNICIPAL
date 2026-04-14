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
import { User } from './user.entity';

export type ErpServiceOrderStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type ErpServiceOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

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

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdByUser!: User | null;

  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status!: ErpServiceOrderStatus;

  @Column({ type: 'varchar', length: 16, default: 'medium' })
  priority!: ErpServiceOrderPriority;

  @Column({ name: 'service_category', type: 'varchar', length: 80, nullable: true })
  serviceCategory!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor!: Date | null;

  @Column({ name: 'promised_for', type: 'timestamptz', nullable: true })
  promisedFor!: Date | null;

  @Column({ name: 'assigned_to', type: 'varchar', length: 160, nullable: true })
  assignedTo!: string | null;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assignedUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser!: User | null;

  @Column({ name: 'contact_name', type: 'varchar', length: 160, nullable: true })
  contactName!: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 32, nullable: true })
  contactPhone!: string | null;

  @Column({ name: 'service_location', type: 'varchar', length: 255, nullable: true })
  serviceLocation!: string | null;

  @Column({ name: 'service_address', type: 'jsonb', default: {} })
  serviceAddress!: Record<string, unknown>;

  @Column({ name: 'diagnosis', type: 'text', nullable: true })
  diagnosis!: string | null;

  @Column({ name: 'resolution', type: 'text', nullable: true })
  resolution!: string | null;

  @Column({ name: 'checklist', type: 'jsonb', default: [] })
  checklist!: string[];

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

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'started_by_user_id', type: 'uuid', nullable: true })
  startedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'started_by_user_id' })
  startedByUser!: User | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'completed_by_user_id', type: 'uuid', nullable: true })
  completedByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'completed_by_user_id' })
  completedByUser!: User | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancelled_by_user_id', type: 'uuid', nullable: true })
  cancelledByUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'cancelled_by_user_id' })
  cancelledByUser!: User | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

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

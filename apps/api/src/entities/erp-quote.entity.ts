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
import { ErpQuoteItem } from './erp-quote-item.entity';

export type ErpQuoteStatus =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'converted'
  | 'cancelled';

export type ErpQuoteSource = 'erp' | 'marketplace' | 'opportunity';

@Entity({ name: 'erp_quotes' })
export class ErpQuote {
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

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status!: ErpQuoteStatus;

  @Column({ type: 'varchar', length: 32, default: 'erp' })
  source!: ErpQuoteSource;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: string | null;

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

  @Column({ name: 'converted_sales_order_id', type: 'uuid', nullable: true })
  convertedSalesOrderId!: string | null;

  @Column({ name: 'converted_service_order_id', type: 'uuid', nullable: true })
  convertedServiceOrderId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ErpQuoteItem, (item) => item.quote)
  items!: ErpQuoteItem[];
}

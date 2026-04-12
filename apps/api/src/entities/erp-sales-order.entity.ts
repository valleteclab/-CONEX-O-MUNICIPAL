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
import { ErpSalesOrderItem } from './erp-sales-order-item.entity';

export type ErpSalesOrderStatus = 'draft' | 'confirmed' | 'cancelled';
export type ErpSalesOrderFiscalStatus =
  | 'none'
  | 'pending'
  | 'authorized'
  | 'cancelled'
  | 'error';

/** Origem do pedido: manual no ERP, PDV, vitrine do diretorio ou central de cotacoes. */
export type ErpSalesOrderSource =
  | 'erp'
  | 'pdv'
  | 'portal_diretorio'
  | 'portal_cotacoes';

@Entity({ name: 'erp_sales_orders' })
export class ErpSalesOrder {
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

  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status!: ErpSalesOrderStatus;

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

  @Column({ type: 'varchar', length: 32, default: 'erp' })
  source!: ErpSalesOrderSource;

  @Column({ name: 'payment_method', type: 'varchar', length: 24, nullable: true })
  paymentMethod!: string | null;

  @Column({ name: 'fiscal_status', type: 'varchar', length: 24, default: 'none' })
  fiscalStatus!: ErpSalesOrderFiscalStatus;

  @Column({ name: 'fiscal_document_type', type: 'varchar', length: 8, nullable: true })
  fiscalDocumentType!: string | null;

  @Column({ name: 'portal_request_id', type: 'uuid', nullable: true })
  portalRequestId!: string | null;

  @Column({ name: 'stock_posted_at', type: 'timestamptz', nullable: true })
  stockPostedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ErpSalesOrderItem, (item) => item.order)
  items!: ErpSalesOrderItem[];
}

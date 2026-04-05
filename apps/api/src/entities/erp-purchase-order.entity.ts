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
import { ErpPurchaseOrderItem } from './erp-purchase-order-item.entity';

export type ErpPurchaseOrderStatus = 'draft' | 'confirmed' | 'received' | 'cancelled';

@Entity({ name: 'erp_purchase_orders' })
export class ErpPurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

  @Column({ name: 'supplier_party_id', type: 'uuid' })
  supplierPartyId: string;

  @ManyToOne(() => ErpParty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_party_id' })
  supplierParty: ErpParty;

  @Column({ type: 'varchar', length: 24, default: 'draft' })
  status: ErpPurchaseOrderStatus;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalAmount: string;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ErpPurchaseOrderItem, (i) => i.order)
  items: ErpPurchaseOrderItem[];
}

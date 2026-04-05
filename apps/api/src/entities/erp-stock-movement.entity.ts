import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ErpBusiness } from './erp-business.entity';
import { ErpProduct } from './erp-product.entity';
import { ErpStockLocation } from './erp-stock-location.entity';
import { User } from './user.entity';

export type ErpStockMovementType = 'in' | 'out' | 'adjust';

@Entity({ name: 'erp_stock_movements' })
export class ErpStockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

  @Column({ length: 16 })
  type: ErpStockMovementType;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ErpProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: ErpProduct;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId: string;

  @ManyToOne(() => ErpStockLocation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: ErpStockLocation;

  /** Sempre > 0; semântica depende do type */
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  quantity: string;

  @Column({ name: 'ref_type', length: 32, nullable: true })
  refType: string | null;

  @Column({ name: 'ref_id', type: 'uuid', nullable: true })
  refId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

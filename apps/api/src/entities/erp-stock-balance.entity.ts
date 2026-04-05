import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ErpBusiness } from './erp-business.entity';
import { ErpProduct } from './erp-product.entity';
import { ErpStockLocation } from './erp-stock-location.entity';

@Entity({ name: 'erp_stock_balances' })
@Unique(['businessId', 'productId', 'locationId'])
export class ErpStockBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

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

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  quantity: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

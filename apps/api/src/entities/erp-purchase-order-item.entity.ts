import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ErpProduct } from './erp-product.entity';
import { ErpPurchaseOrder } from './erp-purchase-order.entity';

@Entity({ name: 'erp_purchase_order_items' })
export class ErpPurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => ErpPurchaseOrder, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: ErpPurchaseOrder;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ErpProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: ErpProduct;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  qty: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4 })
  unitPrice: string;
}

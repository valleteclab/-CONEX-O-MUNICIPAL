import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ErpProduct } from './erp-product.entity';
import { ErpSalesOrder } from './erp-sales-order.entity';

@Entity({ name: 'erp_sales_order_items' })
export class ErpSalesOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => ErpSalesOrder, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: ErpSalesOrder;

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

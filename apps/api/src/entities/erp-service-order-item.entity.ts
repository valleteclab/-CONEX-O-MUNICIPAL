import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ErpProduct } from './erp-product.entity';
import { ErpServiceOrder } from './erp-service-order.entity';

@Entity({ name: 'erp_service_order_items' })
export class ErpServiceOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_order_id', type: 'uuid' })
  serviceOrderId!: string;

  @ManyToOne(() => ErpServiceOrder, (order) => order.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder!: ErpServiceOrder;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @ManyToOne(() => ErpProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product!: ErpProduct;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  qty!: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4 })
  unitPrice!: string;
}

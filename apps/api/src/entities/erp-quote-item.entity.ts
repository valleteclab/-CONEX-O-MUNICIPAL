import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ErpProduct } from './erp-product.entity';
import { ErpQuote } from './erp-quote.entity';

@Entity({ name: 'erp_quote_items' })
export class ErpQuoteItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'quote_id', type: 'uuid' })
  quoteId!: string;

  @ManyToOne(() => ErpQuote, (quote) => quote.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote!: ErpQuote;

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

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ErpProduct } from './erp-product.entity';
import { ErpProductXmlImport } from './erp-product-xml-import.entity';

export type ErpProductXmlImportItemAction = 'link' | 'create' | 'ignore';

@Entity({ name: 'erp_product_xml_import_items' })
export class ErpProductXmlImportItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'import_id', type: 'uuid' })
  importId!: string;

  @ManyToOne(() => ErpProductXmlImport, (row) => row.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'import_id' })
  importRow!: ErpProductXmlImport;

  @Column({ name: 'line_number', type: 'int' })
  lineNumber!: number;

  @Column({ name: 'supplier_code', type: 'varchar', length: 80, nullable: true })
  supplierCode!: string | null;

  @Column({ name: 'barcode', type: 'varchar', length: 32, nullable: true })
  barcode!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 500 })
  name!: string;

  @Column({ name: 'ncm', type: 'varchar', length: 16, nullable: true })
  ncm!: string | null;

  @Column({ name: 'cest', type: 'varchar', length: 16, nullable: true })
  cest!: string | null;

  @Column({ name: 'cfop', type: 'varchar', length: 8, nullable: true })
  cfop!: string | null;

  @Column({ name: 'origin_code', type: 'varchar', length: 4, nullable: true })
  originCode!: string | null;

  @Column({ name: 'unit', type: 'varchar', length: 16, nullable: true })
  unit!: string | null;

  @Column({ name: 'qty', type: 'decimal', precision: 18, scale: 4, default: 0 })
  qty!: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 18, scale: 4, default: 0 })
  unitPrice!: string;

  @Column({ name: 'total_price', type: 'decimal', precision: 18, scale: 4, default: 0 })
  totalPrice!: string;

  @Column({ name: 'suggested_product_id', type: 'uuid', nullable: true })
  suggestedProductId!: string | null;

  @ManyToOne(() => ErpProduct, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'suggested_product_id' })
  suggestedProduct!: ErpProduct | null;

  @Column({ name: 'match_meta', type: 'jsonb', default: {} })
  matchMeta!: Record<string, unknown>;

  @Column({ name: 'action', type: 'varchar', length: 16, nullable: true })
  action!: ErpProductXmlImportItemAction | null;

  @Column({ name: 'selected_product_id', type: 'uuid', nullable: true })
  selectedProductId!: string | null;

  @ManyToOne(() => ErpProduct, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'selected_product_id' })
  selectedProduct!: ErpProduct | null;

  @Column({ name: 'draft_product', type: 'jsonb', default: {} })
  draftProduct!: Record<string, unknown>;
}

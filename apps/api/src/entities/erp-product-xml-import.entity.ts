import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ErpBusiness } from './erp-business.entity';
import { ErpParty } from './erp-party.entity';
import { ErpProductXmlImportItem } from './erp-product-xml-import-item.entity';

export type ErpProductXmlImportStatus = 'uploaded' | 'applied';

@Entity({ name: 'erp_product_xml_imports' })
@Unique(['businessId', 'accessKey'])
export class ErpProductXmlImport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId!: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business!: ErpBusiness;

  @Column({ name: 'supplier_party_id', type: 'uuid', nullable: true })
  supplierPartyId!: string | null;

  @ManyToOne(() => ErpParty, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'supplier_party_id' })
  supplierParty!: ErpParty | null;

  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId!: string | null;

  @Column({ name: 'access_key', type: 'varchar', length: 44 })
  accessKey!: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 32, nullable: true })
  invoiceNumber!: string | null;

  @Column({ name: 'invoice_series', type: 'varchar', length: 16, nullable: true })
  invoiceSeries!: string | null;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'supplier_snapshot', type: 'jsonb', default: {} })
  supplierSnapshot!: Record<string, unknown>;

  @Column({ name: 'summary', type: 'jsonb', default: {} })
  summary!: Record<string, unknown>;

  @Column({ name: 'status', type: 'varchar', length: 24, default: 'uploaded' })
  status!: ErpProductXmlImportStatus;

  @Column({ name: 'xml_hash', type: 'varchar', length: 64 })
  xmlHash!: string;

  @Column({ name: 'source_xml', type: 'text' })
  sourceXml!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ErpProductXmlImportItem, (item) => item.importRow, {
    cascade: true,
  })
  items!: ErpProductXmlImportItem[];
}

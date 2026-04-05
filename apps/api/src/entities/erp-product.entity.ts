import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ErpBusiness } from './erp-business.entity';

@Entity({ name: 'erp_products' })
@Unique(['businessId', 'sku'])
export class ErpProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

  @Column({ type: 'varchar', length: 80 })
  sku: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  ncm: string | null;

  @Column({ name: 'cfop_default', type: 'varchar', length: 8, nullable: true })
  cfopDefault: string | null;

  @Column({ type: 'varchar', length: 16, default: 'UN' })
  unit: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  cost: string;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: 0 })
  price: string;

  @Column({ name: 'min_stock', type: 'decimal', precision: 18, scale: 4, default: 0 })
  minStock: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

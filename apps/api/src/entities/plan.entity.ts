import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity({ name: 'plans' })
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  name: string;

  @Column({ length: 64, unique: true })
  slug: string;

  @Column({ name: 'price_monthly', type: 'decimal', precision: 12, scale: 2, default: 0 })
  priceMonthly: string;

  @Column({ type: 'jsonb', default: {} })
  features: Record<string, unknown>;

  @Column({ name: 'max_users', type: 'int', nullable: true })
  maxUsers: number | null;

  @Column({ name: 'max_businesses', type: 'int', nullable: true })
  maxBusinesses: number | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Tenant, (t) => t.plan)
  tenants: Tenant[];
}

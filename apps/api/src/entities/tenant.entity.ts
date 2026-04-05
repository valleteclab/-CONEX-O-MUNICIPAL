import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plan.entity';
import { UserTenant } from './user-tenant.entity';

@Entity({ name: 'tenants' })
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  domain: string | null;

  @Column({ type: 'char', length: 2, nullable: true })
  state: string | null;

  @Column({ length: 120, nullable: true })
  city: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'primary_color', length: 16, nullable: true })
  primaryColor: string | null;

  @Column({ name: 'secondary_color', length: 16, nullable: true })
  secondaryColor: string | null;

  @Column({ name: 'plan_id', type: 'uuid', nullable: true })
  planId: string | null;

  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => UserTenant, (ut) => ut.tenant)
  userTenants: UserTenant[];
}

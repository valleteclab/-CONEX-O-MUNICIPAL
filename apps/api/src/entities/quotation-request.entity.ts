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
import { Tenant } from './tenant.entity';
import { QuotationResponse } from './quotation-response.entity';
import { User } from './user.entity';

export type QuotationRequestStatus =
  | 'open'
  | 'in_progress'
  | 'closed'
  | 'cancelled';

export type QuotationRequestKind = 'private_market' | 'public_procurement';

@Entity({ name: 'quotation_requests' })
export class QuotationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'requester_user_id', type: 'uuid' })
  requesterUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requester_user_id' })
  requester: User;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 32, default: 'private_market' })
  kind: QuotationRequestKind;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ name: 'desired_date', type: 'date', nullable: true })
  desiredDate: string | null;

  @Column({ name: 'requester_business_id', type: 'uuid', nullable: true })
  requesterBusinessId: string | null;

  @Column({ name: 'responses_count', type: 'int', default: 0 })
  responsesCount: number;

  @Column({ type: 'varchar', length: 32, default: 'open' })
  status: QuotationRequestStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => QuotationResponse, (response) => response.quotationRequest)
  responses: QuotationResponse[];
}

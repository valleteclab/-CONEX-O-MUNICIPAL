import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuotationRequest } from './quotation-request.entity';
import { User } from './user.entity';

@Entity({ name: 'quotation_responses' })
export class QuotationResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'quotation_request_id', type: 'uuid' })
  quotationRequestId!: string;

  @ManyToOne(() => QuotationRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quotation_request_id' })
  quotationRequest!: QuotationRequest;

  @Column({ name: 'responder_user_id', type: 'uuid' })
  responderUserId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'responder_user_id' })
  responder!: User;

  @Column({ name: 'responder_business_id', type: 'uuid', nullable: true })
  responderBusinessId!: string | null;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 24, default: 'submitted' })
  status!: 'submitted';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

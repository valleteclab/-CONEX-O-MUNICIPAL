import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { ErpBusiness } from './erp-business.entity';

export type ErpBusinessMemberRole =
  | 'empresa_owner'
  | 'empresa_operador'
  | 'empresa_financeiro'
  | 'empresa_fiscal';

@Entity({ name: 'erp_business_users' })
@Unique(['userId', 'businessId'])
export class ErpBusinessUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

  @Column({ type: 'varchar', length: 32, default: 'empresa_owner' })
  role: ErpBusinessMemberRole | string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

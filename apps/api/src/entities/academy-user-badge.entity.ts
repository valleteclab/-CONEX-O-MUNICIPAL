import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AcademyBadgeDefinition } from './academy-badge-definition.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity({ name: 'academy_user_badges' })
@Unique('uq_academy_user_badge', ['userId', 'tenantId', 'badgeId'])
export class AcademyUserBadge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'badge_id', type: 'uuid' })
  badgeId: string;

  @ManyToOne(() => AcademyBadgeDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'badge_id' })
  badge: AcademyBadgeDefinition;

  @CreateDateColumn({ name: 'earned_at', type: 'timestamptz' })
  earnedAt: Date;
}

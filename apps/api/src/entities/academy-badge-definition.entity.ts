import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AcademyUserBadge } from './academy-user-badge.entity';

@Entity({ name: 'academy_badge_definitions' })
export class AcademyBadgeDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => AcademyUserBadge, (ub) => ub.badge)
  userBadges?: AcademyUserBadge[];
}

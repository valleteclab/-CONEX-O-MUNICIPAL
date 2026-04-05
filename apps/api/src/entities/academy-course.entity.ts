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
import { AcademyLesson } from './academy-lesson.entity';
import { Tenant } from './tenant.entity';

@Entity({ name: 'academy_courses' })
export class AcademyCourse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @OneToMany(() => AcademyLesson, (l) => l.course)
  lessons?: AcademyLesson[];

  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** URL única por tenant (SDD: GET /courses/:slug) */
  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category: string | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_published', default: true })
  isPublished: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

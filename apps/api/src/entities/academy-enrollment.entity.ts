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
import { AcademyCourse } from './academy-course.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export type AcademyEnrollmentStatus = 'active' | 'completed';

@Entity({ name: 'academy_enrollments' })
@Unique('uq_academy_enrollment_user_course', ['userId', 'courseId'])
export class AcademyEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => AcademyCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: AcademyCourse;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 24, default: 'active' })
  status: AcademyEnrollmentStatus;

  @Column({ name: 'progress_percent', type: 'int', default: 0 })
  progressPercent: number;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

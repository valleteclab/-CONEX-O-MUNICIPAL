import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AcademyCourse } from './academy-course.entity';

export type AcademyLessonKind = 'youtube' | 'text' | 'live_ref';

@Entity({ name: 'academy_lessons' })
export class AcademyLesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => AcademyCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: AcademyCourse;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'content_md', type: 'text', nullable: true })
  contentMd: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  /** URL do vídeo (YouTube: watch, youtu.be ou /embed) */
  @Column({ name: 'video_url', type: 'text', nullable: true })
  videoUrl: string | null;

  @Column({ name: 'lesson_kind', type: 'varchar', length: 24, default: 'youtube' })
  lessonKind: AcademyLessonKind;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

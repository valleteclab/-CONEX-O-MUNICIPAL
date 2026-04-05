import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AcademyLesson } from './academy-lesson.entity';
import { User } from './user.entity';

@Entity({ name: 'academy_lesson_progress' })
@Unique('uq_academy_lesson_progress_user_lesson', ['userId', 'lessonId'])
export class AcademyLessonProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => AcademyLesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: AcademyLesson;

  @CreateDateColumn({ name: 'completed_at', type: 'timestamptz' })
  completedAt: Date;
}

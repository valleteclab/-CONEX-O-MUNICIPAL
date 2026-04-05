import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyBadgeDefinition } from '../entities/academy-badge-definition.entity';
import { AcademyUserBadge } from '../entities/academy-user-badge.entity';
import { AcademyCourse } from '../entities/academy-course.entity';
import { AcademyEnrollment } from '../entities/academy-enrollment.entity';
import { AcademyLesson } from '../entities/academy-lesson.entity';
import { AcademyLessonProgress } from '../entities/academy-lesson-progress.entity';
import { AcademyLiveSession } from '../entities/academy-live-session.entity';
import { AcademyUserGamification } from '../entities/academy-user-gamification.entity';
import { Tenant } from '../entities/tenant.entity';
import { AcademyCertificateService } from './academy-certificate.service';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcademyCourse,
      AcademyLesson,
      AcademyEnrollment,
      AcademyLessonProgress,
      AcademyUserGamification,
      AcademyLiveSession,
      AcademyBadgeDefinition,
      AcademyUserBadge,
      Tenant,
    ]),
  ],
  controllers: [AcademyController],
  providers: [AcademyService, AcademyCertificateService],
})
export class AcademyModule {}

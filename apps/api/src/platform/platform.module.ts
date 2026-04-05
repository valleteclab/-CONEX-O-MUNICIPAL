import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyCourse } from '../entities/academy-course.entity';
import { AcademyLesson } from '../entities/academy-lesson.entity';
import { AcademyLiveSession } from '../entities/academy-live-session.entity';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { ErpBusiness } from '../entities/erp-business.entity';
import { Tenant } from '../entities/tenant.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { PlatformController } from './platform.controller';
import { PlatformAdminService } from './platform-admin.service';
import { PlatformCoursesService } from './platform-courses.service';
import { PlatformLessonsService } from './platform-lessons.service';
import { PlatformLiveSessionsService } from './platform-live-sessions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DirectoryListing,
      ErpBusiness,
      AcademyCourse,
      AcademyLesson,
      AcademyLiveSession,
      Tenant,
    ]),
  ],
  controllers: [PlatformController],
  providers: [
    PlatformAdminService,
    PlatformCoursesService,
    PlatformLessonsService,
    PlatformLiveSessionsService,
    RolesGuard,
  ],
})
export class PlatformModule {}

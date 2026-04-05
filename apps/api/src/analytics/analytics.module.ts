import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyCourse } from '../entities/academy-course.entity';
import { AcademyEnrollment } from '../entities/academy-enrollment.entity';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { ErpBusiness } from '../entities/erp-business.entity';
import { QuotationRequest } from '../entities/quotation-request.entity';
import { User } from '../entities/user.entity';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DirectoryListing,
      ErpBusiness,
      QuotationRequest,
      AcademyEnrollment,
      AcademyCourse,
      User,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RolesGuard],
})
export class AnalyticsModule {}

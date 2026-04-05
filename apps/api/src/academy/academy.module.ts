import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyCourse } from '../entities/academy-course.entity';
import { Tenant } from '../entities/tenant.entity';
import { AcademyController } from './academy.controller';
import { AcademyService } from './academy.service';

@Module({
  imports: [TypeOrmModule.forFeature([AcademyCourse, Tenant])],
  controllers: [AcademyController],
  providers: [AcademyService],
})
export class AcademyModule {}

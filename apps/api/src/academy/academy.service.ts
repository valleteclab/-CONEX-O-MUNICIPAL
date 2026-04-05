import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AcademyCourse } from '../entities/academy-course.entity';
import { AcademyEnrollment } from '../entities/academy-enrollment.entity';
import { AcademyLesson } from '../entities/academy-lesson.entity';
import { Tenant } from '../entities/tenant.entity';
import { ListAcademyQueryDto } from './dto/list-academy-query.dto';
import { UpdateEnrollmentProgressDto } from './dto/update-enrollment-progress.dto';

@Injectable()
export class AcademyService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(AcademyCourse)
    private readonly courses: Repository<AcademyCourse>,
    @InjectRepository(AcademyLesson)
    private readonly lessons: Repository<AcademyLesson>,
    @InjectRepository(AcademyEnrollment)
    private readonly enrollments: Repository<AcademyEnrollment>,
  ) {}

  async resolveTenantId(tenantSlug?: string): Promise<string> {
    const slug =
      tenantSlug?.trim() ||
      this.config.get<string>('tenant.defaultSlug', { infer: true })!;
    const t = await this.tenants.findOne({ where: { slug, isActive: true } });
    if (!t) {
      throw new NotFoundException(`Tenant não encontrado: ${slug}`);
    }
    return t.id;
  }

  async listPublic(
    tenantId: string,
    query: ListAcademyQueryDto,
  ): Promise<{ items: AcademyCourse[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take ?? 50));
    const skip = Math.max(0, query.skip ?? 0);
    const qb = this.courses
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.isPublished = true')
      .orderBy('c.title', 'ASC')
      .skip(skip)
      .take(take);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listFeatured(
    tenantId: string,
    take = 6,
  ): Promise<{ items: AcademyCourse[] }> {
    const n = Math.min(20, Math.max(1, take));
    const items = await this.courses.find({
      where: { tenantId, isPublished: true, isFeatured: true },
      order: { createdAt: 'DESC' },
      take: n,
    });
    return { items };
  }

  async getCourseBySlug(
    tenantId: string,
    slug: string,
  ): Promise<{ course: AcademyCourse; lessons: AcademyLesson[] }> {
    const course = await this.courses.findOne({
      where: { tenantId, slug, isPublished: true },
    });
    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }
    const lessonRows = await this.lessons.find({
      where: { courseId: course.id },
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
    return { course, lessons: lessonRows };
  }

  async enroll(
    user: User,
    tenantId: string,
    courseId: string,
  ): Promise<AcademyEnrollment> {
    const course = await this.courses.findOne({
      where: { id: courseId, tenantId, isPublished: true },
    });
    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }
    const existing = await this.enrollments.findOne({
      where: { userId: user.id, courseId: course.id },
    });
    if (existing) {
      return existing;
    }
    const row = this.enrollments.create({
      tenantId,
      courseId: course.id,
      userId: user.id,
      status: 'active',
      progressPercent: 0,
    });
    return this.enrollments.save(row);
  }

  async listMyCourses(
    userId: string,
    tenantId: string,
    query: ListAcademyQueryDto,
  ): Promise<{ items: AcademyEnrollment[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take ?? 50));
    const skip = Math.max(0, query.skip ?? 0);
    const qb = this.enrollments
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.course', 'course')
      .where('e.userId = :userId', { userId })
      .andWhere('e.tenantId = :tenantId', { tenantId })
      .orderBy('e.updatedAt', 'DESC')
      .skip(skip)
      .take(take);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async updateProgress(
    user: User,
    tenantId: string,
    courseId: string,
    dto: UpdateEnrollmentProgressDto,
  ): Promise<AcademyEnrollment> {
    const row = await this.requireEnrollment(user.id, tenantId, courseId);
    if (row.status === 'completed') {
      return row;
    }
    row.progressPercent = dto.progressPercent;
    if (dto.progressPercent >= 100) {
      row.progressPercent = 100;
      row.status = 'completed';
      row.completedAt = new Date();
    }
    return this.enrollments.save(row);
  }

  async completeCourse(
    user: User,
    tenantId: string,
    courseId: string,
  ): Promise<AcademyEnrollment> {
    const row = await this.requireEnrollment(user.id, tenantId, courseId);
    row.progressPercent = 100;
    row.status = 'completed';
    row.completedAt = new Date();
    return this.enrollments.save(row);
  }

  private async requireEnrollment(
    userId: string,
    tenantId: string,
    courseId: string,
  ): Promise<AcademyEnrollment> {
    const row = await this.enrollments.findOne({
      where: { userId, tenantId, courseId },
      relations: ['course'],
    });
    if (!row) {
      throw new NotFoundException('Matrícula não encontrada');
    }
    return row;
  }
}

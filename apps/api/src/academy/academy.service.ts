import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AcademyCourse } from '../entities/academy-course.entity';
import { AcademyEnrollment } from '../entities/academy-enrollment.entity';
import { AcademyLesson } from '../entities/academy-lesson.entity';
import { AcademyLessonProgress } from '../entities/academy-lesson-progress.entity';
import { AcademyUserGamification } from '../entities/academy-user-gamification.entity';
import { AcademyBadgeDefinition } from '../entities/academy-badge-definition.entity';
import { AcademyUserBadge } from '../entities/academy-user-badge.entity';
import { AcademyLiveSession } from '../entities/academy-live-session.entity';
import { Tenant } from '../entities/tenant.entity';
import { AcademyCertificateService } from './academy-certificate.service';
import { ListAcademyQueryDto } from './dto/list-academy-query.dto';
import { UpdateEnrollmentProgressDto } from './dto/update-enrollment-progress.dto';

const POINTS_ON_COURSE_COMPLETE = 100;

@Injectable()
export class AcademyService {
  constructor(
    private readonly config: ConfigService,
    private readonly certificate: AcademyCertificateService,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(AcademyCourse)
    private readonly courses: Repository<AcademyCourse>,
    @InjectRepository(AcademyLesson)
    private readonly lessons: Repository<AcademyLesson>,
    @InjectRepository(AcademyEnrollment)
    private readonly enrollments: Repository<AcademyEnrollment>,
    @InjectRepository(AcademyLessonProgress)
    private readonly lessonProgress: Repository<AcademyLessonProgress>,
    @InjectRepository(AcademyUserGamification)
    private readonly gamification: Repository<AcademyUserGamification>,
    @InjectRepository(AcademyBadgeDefinition)
    private readonly badgeDefinitions: Repository<AcademyBadgeDefinition>,
    @InjectRepository(AcademyUserBadge)
    private readonly userBadges: Repository<AcademyUserBadge>,
    @InjectRepository(AcademyLiveSession)
    private readonly liveSessions: Repository<AcademyLiveSession>,
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
    await this.attachLessonCounts(items);
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
    await this.attachLessonCounts(items);
    return { items };
  }

  /** Expõe `lessonCount` em cada curso (catálogo / trilhas). */
  private async attachLessonCounts(courses: AcademyCourse[]): Promise<void> {
    if (!courses.length) {
      return;
    }
    const ids = courses.map((c) => c.id);
    const rows = await this.lessons
      .createQueryBuilder('l')
      .select('l.courseId', 'courseId')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.courseId IN (:...ids)', { ids })
      .groupBy('l.courseId')
      .getRawMany<{ courseId: string; cnt: string }>();
    const map = new Map(rows.map((r) => [r.courseId, parseInt(r.cnt, 10)]));
    for (const c of courses) {
      (c as AcademyCourse & { lessonCount?: number }).lessonCount =
        map.get(c.id) ?? 0;
    }
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

  async getLearningView(
    user: User,
    tenantId: string,
    slug: string,
  ): Promise<{
    course: AcademyCourse;
    lessons: AcademyLesson[];
    enrollment: AcademyEnrollment | null;
    completedLessonIds: string[];
    points: number;
  }> {
    const { course, lessons } = await this.getCourseBySlug(tenantId, slug);
    const enrollment = await this.enrollments.findOne({
      where: { userId: user.id, tenantId, courseId: course.id },
      relations: ['course'],
    });
    let completedLessonIds: string[] = [];
    if (lessons.length > 0) {
      const ids = lessons.map((l) => l.id);
      const rows = await this.lessonProgress.find({
        where: { userId: user.id, lessonId: In(ids) },
      });
      completedLessonIds = rows.map((r) => r.lessonId);
    }
    const g = await this.gamification.findOne({
      where: { userId: user.id, tenantId },
    });
    return {
      course,
      lessons,
      enrollment,
      completedLessonIds,
      points: g?.points ?? 0,
    };
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

  async markLessonComplete(
    user: User,
    tenantId: string,
    courseId: string,
    lessonId: string,
  ): Promise<ReturnType<AcademyService['getLearningView']>> {
    const enrollment = await this.enrollments.findOne({
      where: { userId: user.id, tenantId, courseId },
    });
    if (!enrollment) {
      throw new NotFoundException('Matrícula não encontrada');
    }
    const lesson = await this.lessons.findOne({
      where: { id: lessonId, courseId },
    });
    if (!lesson) {
      throw new NotFoundException('Aula não encontrada');
    }
    const exists = await this.lessonProgress.findOne({
      where: { userId: user.id, lessonId },
    });
    if (!exists) {
      await this.lessonProgress.save(
        this.lessonProgress.create({
          userId: user.id,
          lessonId,
        }),
      );
    }
    await this.syncEnrollmentProgressFromLessons(
      user.id,
      tenantId,
      courseId,
    );
    const course = await this.courses.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }
    return this.getLearningView(user, tenantId, course.slug);
  }

  private async syncEnrollmentProgressFromLessons(
    userId: string,
    tenantId: string,
    courseId: string,
  ): Promise<void> {
    const total = await this.lessons.count({ where: { courseId } });
    const row = await this.enrollments.findOne({
      where: { userId, tenantId, courseId },
    });
    if (!row) {
      return;
    }
    if (total === 0) {
      return;
    }
    const lessonRows = await this.lessons.find({
      where: { courseId },
      select: ['id'],
    });
    const lessonIds = lessonRows.map((l) => l.id);
    const done = await this.lessonProgress.count({
      where: { userId, lessonId: In(lessonIds) },
    });
    const pct = Math.min(100, Math.round((100 * done) / total));
    const wasCompleted = row.status === 'completed';
    row.progressPercent = pct;
    if (pct >= 100) {
      row.status = 'completed';
      row.completedAt = row.completedAt ?? new Date();
    } else {
      row.status = 'active';
      row.completedAt = null;
    }
    await this.enrollments.save(row);
    if (pct >= 100 && !wasCompleted) {
      await this.addPoints(userId, tenantId, POINTS_ON_COURSE_COMPLETE);
      await this.awardBadgesAfterCourseComplete(userId, tenantId);
    }
  }

  private async addPoints(
    userId: string,
    tenantId: string,
    delta: number,
  ): Promise<void> {
    let row = await this.gamification.findOne({ where: { userId, tenantId } });
    if (!row) {
      row = this.gamification.create({ userId, tenantId, points: 0 });
    }
    row.points += delta;
    await this.gamification.save(row);
  }

  private async grantBadgeBySlug(
    userId: string,
    tenantId: string,
    slug: string,
  ): Promise<void> {
    const def = await this.badgeDefinitions.findOne({ where: { slug } });
    if (!def) {
      return;
    }
    const exists = await this.userBadges.findOne({
      where: { userId, tenantId, badgeId: def.id },
    });
    if (exists) {
      return;
    }
    await this.userBadges.save(
      this.userBadges.create({
        userId,
        tenantId,
        badgeId: def.id,
      }),
    );
  }

  private async awardBadgesAfterCourseComplete(
    userId: string,
    tenantId: string,
  ): Promise<void> {
    const completedCount = await this.enrollments.count({
      where: { userId, tenantId, status: 'completed' },
    });
    if (completedCount >= 1) {
      await this.grantBadgeBySlug(userId, tenantId, 'primeira-formacao');
    }
    if (completedCount >= 3) {
      await this.grantBadgeBySlug(userId, tenantId, 'trilheiro');
    }
  }

  async getGamificationSummary(
    userId: string,
    tenantId: string,
  ): Promise<{
    points: number;
    badges: Array<{
      slug: string;
      title: string;
      description: string | null;
      earnedAt: string;
    }>;
  }> {
    const row = await this.gamification.findOne({ where: { userId, tenantId } });
    const ub = await this.userBadges.find({
      where: { userId, tenantId },
      relations: ['badge'],
      order: { earnedAt: 'DESC' },
    });
    return {
      points: row?.points ?? 0,
      badges: ub.map((r) => ({
        slug: r.badge.slug,
        title: r.badge.title,
        description: r.badge.description,
        earnedAt: r.earnedAt.toISOString(),
      })),
    };
  }

  async listLiveSessions(
    tenantId: string,
    query: { take?: number; skip?: number },
  ): Promise<{ items: AcademyLiveSession[]; total: number }> {
    const take = Math.min(50, Math.max(1, query.take ?? 20));
    const skip = Math.max(0, query.skip ?? 0);
    const [items, total] = await this.liveSessions.findAndCount({
      where: { tenantId, isPublished: true },
      order: { startsAt: 'ASC' },
      take,
      skip,
    });
    return { items, total };
  }

  async getCertificatePdf(
    user: User,
    tenantId: string,
    courseId: string,
  ): Promise<Uint8Array> {
    const enrollment = await this.enrollments.findOne({
      where: { userId: user.id, tenantId, courseId },
      relations: ['course'],
    });
    if (!enrollment || enrollment.status !== 'completed') {
      throw new BadRequestException(
        'Conclua todas as aulas do curso para obter o certificado.',
      );
    }
    if (!enrollment.course) {
      throw new NotFoundException('Curso não encontrado');
    }
    if (!enrollment.completedAt) {
      throw new BadRequestException('Data de conclusão indisponível.');
    }
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    return this.certificate.build({
      fullName: user.fullName,
      courseTitle: enrollment.course.title,
      completedAt: enrollment.completedAt,
      municipality: tenant?.name ?? 'Município',
    });
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
      const saved = await this.enrollments.save(row);
      await this.addPoints(user.id, tenantId, POINTS_ON_COURSE_COMPLETE);
      await this.awardBadgesAfterCourseComplete(user.id, tenantId);
      return saved;
    }
    return this.enrollments.save(row);
  }

  async completeCourse(
    user: User,
    tenantId: string,
    courseId: string,
  ): Promise<AcademyEnrollment> {
    const row = await this.requireEnrollment(user.id, tenantId, courseId);
    const wasCompleted = row.status === 'completed';
    row.progressPercent = 100;
    row.status = 'completed';
    row.completedAt = new Date();
    const saved = await this.enrollments.save(row);
    if (!wasCompleted) {
      await this.addPoints(user.id, tenantId, POINTS_ON_COURSE_COMPLETE);
      await this.awardBadgesAfterCourseComplete(user.id, tenantId);
    }
    return saved;
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

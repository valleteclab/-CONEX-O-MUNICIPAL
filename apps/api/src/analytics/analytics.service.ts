import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademyEnrollment } from '../entities/academy-enrollment.entity';
import { AcademyCourse } from '../entities/academy-course.entity';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { ErpBusiness } from '../entities/erp-business.entity';
import { QuotationRequest } from '../entities/quotation-request.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';

export type DashboardKpis = {
  directoryListingsPublished: number;
  erpBusinessesActive: number;
  newMeiUsersThisMonth: number;
  quotationsOpen: number;
  academyEnrollmentsActive: number;
  /** SDD: volume de propostas selecionadas — requer modelo de propostas; reservado */
  transactionVolumeSelected: number | null;
  npsScore: number | null;
  chatbotResolutionRate: number | null;
};

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(DirectoryListing)
    private readonly directory: Repository<DirectoryListing>,
    @InjectRepository(ErpBusiness)
    private readonly erpBusinesses: Repository<ErpBusiness>,
    @InjectRepository(QuotationRequest)
    private readonly quotations: Repository<QuotationRequest>,
    @InjectRepository(AcademyEnrollment)
    private readonly enrollments: Repository<AcademyEnrollment>,
    @InjectRepository(AcademyCourse)
    private readonly courses: Repository<AcademyCourse>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async getDashboard(tenantId: string): Promise<{
    tenantId: string;
    generatedAt: string;
    kpis: DashboardKpis;
  }> {
    const [
      directoryListingsPublished,
      erpBusinessesActive,
      newMeiUsersThisMonth,
      quotationsOpen,
      academyEnrollmentsActive,
    ] = await Promise.all([
      this.directory.count({
        where: {
          tenantId,
          isPublished: true,
          moderationStatus: 'approved',
        },
      }),
      this.erpBusinesses.count({
        where: { tenantId, isActive: true, moderationStatus: 'approved' },
      }),
      this.countNewMeiUsersThisMonth(tenantId),
      this.quotations.count({
        where: { tenantId, status: 'open' },
      }),
      this.enrollments.count({
        where: { tenantId, status: 'active' },
      }),
    ]);

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      kpis: {
        directoryListingsPublished,
        erpBusinessesActive,
        newMeiUsersThisMonth,
        quotationsOpen,
        academyEnrollmentsActive,
        transactionVolumeSelected: null,
        npsScore: null,
        chatbotResolutionRate: null,
      },
    };
  }

  private async countNewMeiUsersThisMonth(tenantId: string): Promise<number> {
    return this.users
      .createQueryBuilder('u')
      .innerJoin(UserTenant, 'ut', 'ut.userId = u.id')
      .where('ut.tenantId = :tenantId', { tenantId })
      .andWhere('ut.isActive = :ia', { ia: true })
      .andWhere("u.role = 'mei'")
      .andWhere("u.created_at >= date_trunc('month', CURRENT_TIMESTAMP)")
      .getCount();
  }

  async getBusinessesStats(tenantId: string): Promise<{
    directoryTotal: number;
    directoryPublished: number;
    erpBusinessesTotal: number;
    erpBusinessesActive: number;
    byDirectoryCategory: { category: string | null; count: number }[];
  }> {
    const [directoryTotal, directoryPublished, erpTotal, erpActive] =
      await Promise.all([
        this.directory.count({ where: { tenantId } }),
        this.directory.count({
          where: {
            tenantId,
            isPublished: true,
            moderationStatus: 'approved',
          },
        }),
        this.erpBusinesses.count({ where: { tenantId } }),
        this.erpBusinesses.count({
          where: { tenantId, isActive: true, moderationStatus: 'approved' },
        }),
      ]);

    const raw = await this.directory
      .createQueryBuilder('d')
      .select('d.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('d.tenant_id = :tenantId', { tenantId })
      .groupBy('d.category')
      .getRawMany<{ category: string | null; count: string }>();

    const byDirectoryCategory = raw.map((r) => ({
      category: r.category,
      count: parseInt(r.count, 10),
    }));

    return {
      directoryTotal,
      directoryPublished,
      erpBusinessesTotal: erpTotal,
      erpBusinessesActive: erpActive,
      byDirectoryCategory,
    };
  }

  async getQuotationsStats(tenantId: string): Promise<{
    byStatus: { status: string; count: number }[];
    total: number;
  }> {
    const raw = await this.quotations
      .createQueryBuilder('q')
      .select('q.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('q.tenant_id = :tenantId', { tenantId })
      .groupBy('q.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus = raw.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
    const total = byStatus.reduce((s, x) => s + x.count, 0);
    return { byStatus, total };
  }

  async getAcademyStats(tenantId: string): Promise<{
    coursesPublished: number;
    enrollmentsByStatus: { status: string; count: number }[];
    enrollmentsTotal: number;
  }> {
    const coursesPublished = await this.courses.count({
      where: { tenantId, isPublished: true },
    });

    const raw = await this.enrollments
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('e.tenant_id = :tenantId', { tenantId })
      .groupBy('e.status')
      .getRawMany<{ status: string; count: string }>();

    const enrollmentsByStatus = raw.map((r) => ({
      status: r.status,
      count: parseInt(r.count, 10),
    }));
    const enrollmentsTotal = enrollmentsByStatus.reduce((s, x) => s + x.count, 0);

    return {
      coursesPublished,
      enrollmentsByStatus,
      enrollmentsTotal,
    };
  }
}

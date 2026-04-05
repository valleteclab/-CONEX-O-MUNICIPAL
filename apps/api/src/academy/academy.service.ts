import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademyCourse } from '../entities/academy-course.entity';
import { Tenant } from '../entities/tenant.entity';
import { ListAcademyQueryDto } from './dto/list-academy-query.dto';

@Injectable()
export class AcademyService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(AcademyCourse)
    private readonly courses: Repository<AcademyCourse>,
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
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { QuotationRequest } from '../entities/quotation-request.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { ListQuotationQueryDto } from './dto/list-quotation-query.dto';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(QuotationRequest)
    private readonly quotations: Repository<QuotationRequest>,
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
    query: ListQuotationQueryDto,
  ): Promise<{ items: QuotationRequest[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take ?? 50));
    const skip = Math.max(0, query.skip ?? 0);
    const qb = this.quotations
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId })
      .andWhere('q.status IN (:...st)', { st: ['open', 'in_progress'] })
      .orderBy('q.created_at', 'DESC')
      .skip(skip)
      .take(take);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listMine(
    userId: string,
    tenantId: string,
    query: ListQuotationQueryDto,
  ): Promise<{ items: QuotationRequest[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take ?? 50));
    const skip = Math.max(0, query.skip ?? 0);
    const qb = this.quotations
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId })
      .andWhere('q.requesterUserId = :userId', { userId })
      .orderBy('q.created_at', 'DESC')
      .skip(skip)
      .take(take);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async create(
    user: User,
    tenantId: string,
    dto: CreateQuotationDto,
  ): Promise<QuotationRequest> {
    const row = this.quotations.create({
      tenantId,
      requesterUserId: user.id,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      status: 'open',
    });
    return this.quotations.save(row);
  }
}

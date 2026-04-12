import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { QuotationRequest } from '../entities/quotation-request.entity';
import { QuotationResponse } from '../entities/quotation-response.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { CreateQuotationResponseDto } from './dto/create-quotation-response.dto';
import { ListQuotationQueryDto } from './dto/list-quotation-query.dto';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(QuotationRequest)
    private readonly quotations: Repository<QuotationRequest>,
    @InjectRepository(QuotationResponse)
    private readonly responses: Repository<QuotationResponse>,
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

    if (query.kind) {
      qb.andWhere('q.kind = :kind', { kind: query.kind });
    }
    if (query.category?.trim()) {
      qb.andWhere('q.category = :category', { category: query.category.trim() });
    }

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
      kind: dto.kind ?? 'private_market',
      category: dto.category?.trim() || null,
      desiredDate: dto.desiredDate ?? null,
      requesterBusinessId: dto.requesterBusinessId ?? null,
      responsesCount: 0,
      status: 'open',
    });
    return this.quotations.save(row);
  }

  async createResponse(
    user: User,
    tenantId: string,
    quotationId: string,
    dto: CreateQuotationResponseDto,
  ): Promise<QuotationResponse> {
    return this.dataSource.transaction(async (em) => {
      const quotation = await em.findOne(QuotationRequest, {
        where: { id: quotationId, tenantId },
      });
      if (!quotation) {
        throw new NotFoundException('Oportunidade não encontrada');
      }
      if (!['open', 'in_progress'].includes(quotation.status)) {
        throw new BadRequestException('Esta oportunidade não aceita novas respostas');
      }

      const duplicate = await em.findOne(QuotationResponse, {
        where: {
          tenantId,
          quotationRequestId: quotationId,
          responderUserId: user.id,
        },
      });
      if (duplicate) {
        throw new BadRequestException('Você já enviou uma resposta para esta oportunidade');
      }

      const response = em.create(QuotationResponse, {
        tenantId,
        quotationRequestId: quotationId,
        responderUserId: user.id,
        responderBusinessId: dto.responderBusinessId ?? null,
        message: dto.message.trim(),
        status: 'submitted',
      });
      await em.save(response);

      quotation.responsesCount += 1;
      quotation.status = 'in_progress';
      await em.save(quotation);
      return response;
    });
  }
}

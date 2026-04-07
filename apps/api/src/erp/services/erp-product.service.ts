import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { ErpProductClassificationJob } from '../../entities/erp-product-classification-job.entity';
import { CreateErpProductDto, UpdateErpProductDto } from '../dto/product.dto';
import { dec } from '../utils/decimal';
import { OpenRouterService } from './openrouter.service';
import { PlatformSettingsService } from '../../platform/platform-settings.service';

@Injectable()
export class ErpProductService {
  constructor(
    @InjectRepository(ErpProduct)
    private readonly products: Repository<ErpProduct>,
    @InjectRepository(ErpProductClassificationJob)
    private readonly jobs: Repository<ErpProductClassificationJob>,
    private readonly ai: OpenRouterService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  async list(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpProduct[]; total: number }> {
    const [items, total] = await this.products.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { name: 'ASC' },
      take: Math.min(take, 100),
      skip,
    });
    return { items, total };
  }

  async create(business: ErpBusiness, dto: CreateErpProductDto): Promise<ErpProduct> {
    const row = this.products.create({
      tenantId: business.tenantId,
      businessId: business.id,
      kind: dto.kind ?? 'product',
      sku: dto.sku.trim(),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      barcode: dto.barcode?.trim() || null,
      ncm: dto.ncm?.trim() || null,
      cest: dto.cest?.trim() || null,
      originCode: dto.originCode?.trim() || null,
      cfopDefault: dto.cfopDefault?.trim() || null,
      unit: dto.unit?.trim() || 'UN',
      cost: dec(dto.cost ?? '0'),
      price: dec(dto.price ?? '0'),
      minStock: dec(dto.minStock ?? '0'),
      taxConfig: dto.taxConfig ?? {},
      isActive: true,
    });
    return this.products.save(row);
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpProduct> {
    const row = await this.products.findOne({
      where: {
        id,
        businessId: business.id,
        tenantId: business.tenantId,
      },
    });
    if (!row) {
      throw new NotFoundException('Produto não encontrado');
    }
    return row;
  }

  async update(
    business: ErpBusiness,
    id: string,
    dto: UpdateErpProductDto,
  ): Promise<ErpProduct> {
    const row = await this.findOne(business, id);
    if (dto.kind !== undefined) {
      row.kind = dto.kind;
    }
    if (dto.name !== undefined) {
      row.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() || null;
    }
    if (dto.barcode !== undefined) {
      row.barcode = dto.barcode?.trim() || null;
    }
    if (dto.ncm !== undefined) {
      row.ncm = dto.ncm?.trim() || null;
    }
    if (dto.cest !== undefined) {
      row.cest = dto.cest?.trim() || null;
    }
    if (dto.originCode !== undefined) {
      row.originCode = dto.originCode?.trim() || null;
    }
    if (dto.cfopDefault !== undefined) {
      row.cfopDefault = dto.cfopDefault?.trim() || null;
    }
    if (dto.unit !== undefined) {
      row.unit = dto.unit.trim();
    }
    if (dto.cost !== undefined) {
      row.cost = dec(dto.cost);
    }
    if (dto.price !== undefined) {
      row.price = dec(dto.price);
    }
    if (dto.minStock !== undefined) {
      row.minStock = dec(dto.minStock);
    }
    if (dto.taxConfig !== undefined) {
      row.taxConfig = dto.taxConfig;
    }
    if (dto.isActive !== undefined) {
      row.isActive = dto.isActive;
    }
    return this.products.save(row);
  }

  async createClassificationJob(params: {
    business: ErpBusiness;
    requestedByUserId?: string | null;
    filter: Record<string, unknown>;
    limit: number;
  }): Promise<ErpProductClassificationJob> {
    const setting = await this.platformSettings.getErpProductClassifier();
    const cap = Math.min(setting.maxItemsPerJob, 500);
    const limit = Math.min(Math.max(1, params.limit), cap);
    const row = this.jobs.create({
      tenantId: params.business.tenantId,
      businessId: params.business.id,
      requestedByUserId: params.requestedByUserId ?? null,
      status: 'queued',
      filter: { ...params.filter, limit },
      stats: {},
      result: null,
      error: null,
    });
    return this.jobs.save(row);
  }

  async getClassificationJob(
    business: ErpBusiness,
    jobId: string,
  ): Promise<ErpProductClassificationJob> {
    const row = await this.jobs.findOne({
      where: { id: jobId, businessId: business.id, tenantId: business.tenantId },
    });
    if (!row) throw new NotFoundException('Job não encontrado');
    return row;
  }

  async applyClassificationJob(
    business: ErpBusiness,
    jobId: string,
  ): Promise<{ applied: number; skipped: number }> {
    const job = await this.getClassificationJob(business, jobId);
    if (job.status !== 'done') {
      throw new BadRequestException('Job ainda não finalizado');
    }
    const suggestions = (job.result?.['suggestions'] ?? []) as Array<any>;
    let applied = 0;
    let skipped = 0;
    for (const s of suggestions) {
      const productId = String(s.productId ?? '');
      const ncm = String(s.ncm ?? '').replace(/\D/g, '');
      if (!productId || ncm.length !== 8) {
        skipped++;
        continue;
      }
      const p = await this.products.findOne({
        where: { id: productId, businessId: business.id, tenantId: business.tenantId },
      });
      if (!p) {
        skipped++;
        continue;
      }
      // não sobrescrever NCM existente válido
      const existing = (p.ncm ?? '').replace(/\D/g, '');
      if (existing.length === 8) {
        skipped++;
        continue;
      }
      p.ncm = ncm;
      if (s.cfopDefault) p.cfopDefault = String(s.cfopDefault);
      if (s.originCode !== undefined && s.originCode !== null) p.originCode = String(s.originCode);
      if (s.cest) p.cest = String(s.cest);
      p.taxConfig = {
        ...(p.taxConfig ?? {}),
        ai: {
          provider: 'openrouter',
          model: String(job.result?.['model'] ?? ''),
          confidence: s.confidence ?? null,
          rationale: s.rationale ?? null,
          classifiedAt: new Date().toISOString(),
          jobId: job.id,
        },
      };
      await this.products.save(p);
      applied++;
    }
    return { applied, skipped };
  }

  /**
   * Worker inline (sem filas externas): processa 1 job queued.
   * Chamado por `ErpProductClassificationWorker`.
   */
  async runOneQueuedClassificationJob(): Promise<boolean> {
    const job = await this.jobs.findOne({
      where: { status: 'queued' as any },
      order: { createdAt: 'ASC' },
    });
    if (!job) return false;

    job.status = 'running';
    job.error = null;
    await this.jobs.save(job);

    try {
      const setting = await this.platformSettings.getErpProductClassifier();
      const onlyMissingNcm = Boolean(job.filter?.['onlyMissingNcm'] ?? true);
      const limit = Number(job.filter?.['limit'] ?? setting.maxItemsPerJob) || setting.maxItemsPerJob;
      const ids = Array.isArray(job.filter?.['productIds']) ? (job.filter?.['productIds'] as unknown[]) : null;
      const productIds = ids ? ids.map(String) : null;

      const qb = this.products
        .createQueryBuilder('p')
        .where('p.business_id = :bid', { bid: job.businessId })
        .andWhere('p.tenant_id = :tid', { tid: job.tenantId })
        .andWhere('p.is_active = true');

      if (productIds?.length) {
        qb.andWhere('p.id IN (:...ids)', { ids: productIds });
      }
      if (onlyMissingNcm) {
        qb.andWhere("(p.ncm IS NULL OR regexp_replace(p.ncm, '\\\\D', '', 'g') = '' OR length(regexp_replace(p.ncm, '\\\\D', '', 'g')) <> 8)");
      }

      qb.orderBy('p.created_at', 'DESC').take(Math.min(Math.max(1, limit), 500));
      const products = await qb.getMany();

      const promptItems = products.map((p) => ({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        description: p.description,
        barcode: p.barcode,
        kind: p.kind,
        unit: p.unit,
      }));

      const messages = [
        {
          role: 'system' as const,
          content:
            'Você é um assistente fiscal brasileiro. Para cada item, sugira NCM (8 dígitos) e, se aplicável, CEST, CFOP padrão e código de origem. Responda SOMENTE em JSON.',
        },
        {
          role: 'user' as const,
          content: JSON.stringify({
            task: 'classify_products',
            rules: {
              ncm: 'string com 8 dígitos',
              cfopDefault: 'string com 4 dígitos (opcional)',
              originCode: 'string 0-8 (opcional)',
              cest: 'string (opcional)',
              confidence: 'number 0-1',
              rationale: 'string curta',
            },
            items: promptItems,
            output: {
              suggestions:
                'array de { productId, ncm, cfopDefault?, originCode?, cest?, confidence, rationale }',
            },
          }),
        },
      ];

      const aiRes = await this.ai.chatJson({
        model: setting.model,
        messages,
        temperature: setting.temperature,
        maxTokens: 2000,
      });

      const parsed = (aiRes.json ?? {}) as any;
      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
      const normalized: any[] = [];
      const errors: any[] = [];

      for (const s of suggestions) {
        const productId = String(s.productId ?? '');
        const ncm = String(s.ncm ?? '').replace(/\D/g, '');
        if (!productId || ncm.length !== 8) {
          errors.push({ productId, error: 'NCM inválido ou ausente' });
          continue;
        }
        normalized.push({
          productId,
          ncm,
          cfopDefault: s.cfopDefault ? String(s.cfopDefault) : undefined,
          originCode: s.originCode !== undefined && s.originCode !== null ? String(s.originCode) : undefined,
          cest: s.cest ? String(s.cest) : undefined,
          confidence: typeof s.confidence === 'number' ? s.confidence : null,
          rationale: s.rationale ? String(s.rationale) : null,
        });
      }

      job.status = 'done';
      job.stats = {
        totalInput: products.length,
        suggested: normalized.length,
        invalid: errors.length,
      };
      job.result = {
        model: setting.model,
        rawId: aiRes.rawId ?? null,
        suggestions: normalized,
        errors,
      };
      await this.jobs.save(job);
      return true;
    } catch (err) {
      job.status = 'failed';
      job.error = (err as Error).message;
      await this.jobs.save(job);
      return true;
    }
  }
}

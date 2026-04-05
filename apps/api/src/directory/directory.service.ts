import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { Tenant } from '../entities/tenant.entity';
import { CreateDirectoryListingDto } from './dto/create-directory-listing.dto';
import { ListDirectoryQueryDto } from './dto/list-directory-query.dto';
import { UpdateDirectoryListingDto } from './dto/update-directory-listing.dto';

@Injectable()
export class DirectoryService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(DirectoryListing)
    private readonly listings: Repository<DirectoryListing>,
  ) {}

  async resolveTenantId(tenantSlug?: string): Promise<string> {
    const slug =
      tenantSlug?.trim() ||
      this.config.get<string>('tenant.defaultSlug', { infer: true })!;
    const t = await this.tenants.findOne({ where: { slug, isActive: true } });
    if (!t) {
      throw new BadRequestException(`Tenant não encontrado: ${slug}`);
    }
    return t.id;
  }

  async listPublic(
    tenantId: string,
    query: ListDirectoryQueryDto,
  ): Promise<{ items: DirectoryListing[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take ?? 50));
    const skip = Math.max(0, query.skip ?? 0);
    const qb = this.listings
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.is_published = true');

    if (query.category?.trim()) {
      qb.andWhere('l.category = :cat', { cat: query.category.trim() });
    }
    if (query.modo) {
      qb.andWhere('l.modo = :modo', { modo: query.modo });
    }
    if (query.q?.trim()) {
      const term = `%${query.q.trim()}%`;
      qb.andWhere(
        '(l.trade_name ILIKE :term OR l.description ILIKE :term)',
        { term },
      );
    }

    if (query.sort === 'recent') {
      qb.orderBy('l.created_at', 'DESC');
    } else {
      qb.orderBy('l.trade_name', 'ASC');
    }

    qb.skip(skip).take(take);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async listFeatured(tenantId: string, take = 6): Promise<DirectoryListing[]> {
    return this.listings.find({
      where: { tenantId, isPublished: true },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(1, take), 12),
    });
  }

  async listCategories(tenantId: string): Promise<string[]> {
    const rows = await this.listings
      .createQueryBuilder('l')
      .select('DISTINCT l.category', 'category')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.is_published = true')
      .andWhere('l.category IS NOT NULL')
      .andWhere("TRIM(l.category) <> ''")
      .orderBy('category', 'ASC')
      .getRawMany<{ category: string }>();

    return rows.map((row) => row.category);
  }

  async search(
    tenantId: string,
    query: ListDirectoryQueryDto,
  ): Promise<{ items: DirectoryListing[]; total: number }> {
    return this.listPublic(tenantId, query);
  }

  async findBySlugPublic(
    tenantId: string,
    slug: string,
  ): Promise<DirectoryListing> {
    const row = await this.listings.findOne({
      where: {
        tenantId,
        slug,
        isPublished: true,
      },
    });
    if (!row) {
      throw new NotFoundException('Negócio não encontrado');
    }
    return row;
  }

  async listMine(user: User, tenantId: string): Promise<DirectoryListing[]> {
    return this.listings.find({
      where: { tenantId, ownerUserId: user.id },
      order: { updatedAt: 'DESC' },
    });
  }

  async create(
    user: User,
    tenantId: string,
    dto: CreateDirectoryListingDto,
  ): Promise<DirectoryListing> {
    if (!['mei', 'company'].includes(user.role)) {
      throw new ForbiddenException(
        'Apenas perfil MEI ou Empresa pode criar vitrine no diretório',
      );
    }
    const slug = dto.slug.trim().toLowerCase();
    const dup = await this.listings.count({
      where: { tenantId, slug },
    });
    if (dup > 0) {
      throw new BadRequestException('Já existe um negócio com este slug');
    }
    const row = this.listings.create({
      tenantId,
      slug,
      tradeName: dto.tradeName.trim(),
      description: dto.description?.trim() || null,
      category: dto.category?.trim() || null,
      modo: dto.modo,
      ownerUserId: user.id,
      isPublished: true,
    });
    return this.listings.save(row);
  }

  async updateMine(
    user: User,
    tenantId: string,
    id: string,
    dto: UpdateDirectoryListingDto,
  ): Promise<DirectoryListing> {
    const row = await this.listings.findOne({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException('Negócio não encontrado');
    }
    if (row.ownerUserId !== user.id && !['manager', 'admin'].includes(user.role)) {
      throw new ForbiddenException('Sem permissão para editar este cadastro');
    }
    if (dto.tradeName !== undefined) {
      row.tradeName = dto.tradeName.trim();
    }
    if (dto.description !== undefined) {
      row.description = dto.description?.trim() || null;
    }
    if (dto.category !== undefined) {
      row.category = dto.category?.trim() || null;
    }
    if (dto.modo !== undefined) {
      row.modo = dto.modo;
    }
    if (dto.isPublished !== undefined) {
      row.isPublished = dto.isPublished;
    }
    return this.listings.save(row);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DirectoryListing } from '../entities/directory-listing.entity';
import { ErpBusiness } from '../entities/erp-business.entity';
import { AdminModerationActionDto } from './dto/admin-moderation-action.dto';

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectRepository(DirectoryListing)
    private readonly listings: Repository<DirectoryListing>,
    @InjectRepository(ErpBusiness)
    private readonly erpBusinesses: Repository<ErpBusiness>,
  ) {}

  async listDirectoryListings(query: {
    status?: string;
    skip: number;
    take: number;
  }): Promise<{ items: DirectoryListing[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take));
    const skip = Math.max(0, query.skip);
    const qb = this.listings
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.tenant', 'tenant')
      .leftJoinAndSelect('l.owner', 'owner')
      .orderBy('l.createdAt', 'DESC');
    if (query.status && query.status !== 'all') {
      qb.andWhere('l.moderation_status = :st', { st: query.status });
    }
    qb.skip(skip).take(take);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async applyDirectoryAction(
    id: string,
    dto: AdminModerationActionDto,
  ): Promise<DirectoryListing> {
    const row = await this.listings.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Cadastro não encontrado');
    }
    switch (dto.action) {
      case 'approve':
        row.moderationStatus = 'approved';
        row.isPublished = true;
        break;
      case 'reject':
        row.moderationStatus = 'rejected';
        row.isPublished = false;
        break;
      case 'suspend':
        if (row.moderationStatus !== 'approved') {
          throw new BadRequestException('Só é possível suspender cadastros aprovados');
        }
        row.isPublished = false;
        break;
      case 'publish':
        if (row.moderationStatus !== 'approved') {
          throw new BadRequestException(
            'Aprove o cadastro antes de publicar no diretório',
          );
        }
        row.isPublished = true;
        break;
      default:
        throw new BadRequestException('Ação inválida para o diretório');
    }
    return this.listings.save(row);
  }

  async listErpBusinesses(query: {
    status?: string;
    skip: number;
    take: number;
  }): Promise<{ items: ErpBusiness[]; total: number }> {
    const take = Math.min(100, Math.max(1, query.take));
    const skip = Math.max(0, query.skip);
    const qb = this.erpBusinesses
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .orderBy('b.createdAt', 'DESC');
    if (query.status && query.status !== 'all') {
      qb.andWhere('b.moderation_status = :st', { st: query.status });
    }
    qb.skip(skip).take(take);
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async applyErpBusinessAction(
    id: string,
    dto: AdminModerationActionDto,
  ): Promise<ErpBusiness> {
    const row = await this.erpBusinesses.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Negócio ERP não encontrado');
    }
    switch (dto.action) {
      case 'approve':
        row.moderationStatus = 'approved';
        row.isActive = true;
        break;
      case 'reject':
        row.moderationStatus = 'rejected';
        row.isActive = false;
        break;
      case 'suspend':
        if (row.moderationStatus !== 'approved') {
          throw new BadRequestException('Só é possível suspender negócios aprovados');
        }
        row.isActive = false;
        break;
      case 'activate':
        if (row.moderationStatus !== 'approved') {
          throw new BadRequestException(
            'Aprove o cadastro antes de reativar operação',
          );
        }
        row.isActive = true;
        break;
      default:
        throw new BadRequestException('Ação inválida para o ERP');
    }
    return this.erpBusinesses.save(row);
  }
}

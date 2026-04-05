import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpParty } from '../../entities/erp-party.entity';
import { CreateErpPartyDto, UpdateErpPartyDto } from '../dto/party.dto';

@Injectable()
export class ErpPartyService {
  constructor(
    @InjectRepository(ErpParty)
    private readonly parties: Repository<ErpParty>,
  ) {}

  async list(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpParty[]; total: number }> {
    const [items, total] = await this.parties.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { name: 'ASC' },
      take: Math.min(take, 100),
      skip,
    });
    return { items, total };
  }

  async create(business: ErpBusiness, dto: CreateErpPartyDto): Promise<ErpParty> {
    const row = this.parties.create({
      tenantId: business.tenantId,
      businessId: business.id,
      type: dto.type,
      name: dto.name.trim(),
      document: dto.document?.replace(/\D/g, '') || null,
      address: dto.address ?? {},
      isActive: true,
    });
    return this.parties.save(row);
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpParty> {
    const row = await this.parties.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
    });
    if (!row) {
      throw new NotFoundException('Cliente/fornecedor não encontrado');
    }
    return row;
  }

  async update(
    business: ErpBusiness,
    id: string,
    dto: UpdateErpPartyDto,
  ): Promise<ErpParty> {
    const row = await this.findOne(business, id);
    if (dto.type !== undefined) {
      row.type = dto.type;
    }
    if (dto.name !== undefined) {
      row.name = dto.name.trim();
    }
    if (dto.document !== undefined) {
      row.document = dto.document?.replace(/\D/g, '') || null;
    }
    if (dto.address !== undefined) {
      row.address = dto.address;
    }
    if (dto.isActive !== undefined) {
      row.isActive = dto.isActive;
    }
    return this.parties.save(row);
  }
}

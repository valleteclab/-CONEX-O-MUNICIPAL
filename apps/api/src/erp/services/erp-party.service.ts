import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeFiscalDocument } from '../../common/fiscal-document';
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

  async findByDocument(
    business: ErpBusiness,
    document: string,
  ): Promise<ErpParty | null> {
    const normalized = normalizeFiscalDocument(document);
    if (!normalized) {
      return null;
    }

    const rows = await this.parties.find({
      where: {
        businessId: business.id,
        tenantId: business.tenantId,
        document: normalized,
        isActive: true,
      },
      order: { createdAt: 'ASC' },
    });

    return (
      rows.find((row) => row.type === 'customer' || row.type === 'both') ??
      rows[0] ??
      null
    );
  }

  async create(business: ErpBusiness, dto: CreateErpPartyDto): Promise<ErpParty> {
    const row = this.parties.create({
      tenantId: business.tenantId,
      businessId: business.id,
      type: dto.type,
      name: dto.name.trim(),
      legalName: dto.legalName?.trim() || null,
      document: normalizeFiscalDocument(dto.document) || null,
      email: dto.email?.trim().toLowerCase() || null,
      phone: dto.phone?.trim() || null,
      stateRegistration: dto.stateRegistration?.trim() || null,
      municipalRegistration: dto.municipalRegistration?.trim() || null,
      taxpayerType: dto.taxpayerType?.trim() || null,
      address: dto.address ?? {},
      notes: dto.notes?.trim() || null,
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
    if (dto.legalName !== undefined) {
      row.legalName = dto.legalName?.trim() || null;
    }
    if (dto.document !== undefined) {
      row.document = normalizeFiscalDocument(dto.document) || null;
    }
    if (dto.email !== undefined) {
      row.email = dto.email?.trim().toLowerCase() || null;
    }
    if (dto.phone !== undefined) {
      row.phone = dto.phone?.trim() || null;
    }
    if (dto.stateRegistration !== undefined) {
      row.stateRegistration = dto.stateRegistration?.trim() || null;
    }
    if (dto.municipalRegistration !== undefined) {
      row.municipalRegistration = dto.municipalRegistration?.trim() || null;
    }
    if (dto.taxpayerType !== undefined) {
      row.taxpayerType = dto.taxpayerType?.trim() || null;
    }
    if (dto.address !== undefined) {
      row.address = dto.address;
    }
    if (dto.notes !== undefined) {
      row.notes = dto.notes?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      row.isActive = dto.isActive;
    }
    return this.parties.save(row);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { CreateErpProductDto, UpdateErpProductDto } from '../dto/product.dto';
import { dec } from '../utils/decimal';

@Injectable()
export class ErpProductService {
  constructor(
    @InjectRepository(ErpProduct)
    private readonly products: Repository<ErpProduct>,
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
      sku: dto.sku.trim(),
      name: dto.name.trim(),
      ncm: dto.ncm?.trim() || null,
      cfopDefault: dto.cfopDefault?.trim() || null,
      unit: dto.unit?.trim() || 'UN',
      cost: dec(dto.cost ?? '0'),
      price: dec(dto.price ?? '0'),
      minStock: dec(dto.minStock ?? '0'),
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
    if (dto.name !== undefined) {
      row.name = dto.name.trim();
    }
    if (dto.ncm !== undefined) {
      row.ncm = dto.ncm?.trim() || null;
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
    if (dto.isActive !== undefined) {
      row.isActive = dto.isActive;
    }
    return this.products.save(row);
  }
}

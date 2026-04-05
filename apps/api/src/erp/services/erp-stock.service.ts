import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { ErpStockBalance } from '../../entities/erp-stock-balance.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { ErpStockMovement } from '../../entities/erp-stock-movement.entity';
import { CreateStockLocationDto, CreateStockMovementDto } from '../dto/stock.dto';
import { dec } from '../utils/decimal';

@Injectable()
export class ErpStockService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErpStockLocation)
    private readonly locations: Repository<ErpStockLocation>,
    @InjectRepository(ErpStockBalance)
    private readonly balances: Repository<ErpStockBalance>,
    @InjectRepository(ErpStockMovement)
    private readonly movements: Repository<ErpStockMovement>,
    @InjectRepository(ErpProduct)
    private readonly products: Repository<ErpProduct>,
  ) {}

  async listLocations(business: ErpBusiness): Promise<ErpStockLocation[]> {
    return this.locations.find({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { name: 'ASC' },
    });
  }

  async createLocation(
    business: ErpBusiness,
    dto: CreateStockLocationDto,
  ): Promise<ErpStockLocation> {
    return this.dataSource.transaction(async (em) => {
      if (dto.isDefault) {
        await em.update(
          ErpStockLocation,
          { businessId: business.id, tenantId: business.tenantId },
          { isDefault: false },
        );
      }
      const row = em.create(ErpStockLocation, {
        tenantId: business.tenantId,
        businessId: business.id,
        name: dto.name.trim(),
        isDefault: dto.isDefault ?? false,
      });
      return em.save(row);
    });
  }

  async listBalances(
    business: ErpBusiness,
    locationId?: string,
  ): Promise<ErpStockBalance[]> {
    return this.balances.find({
      where: {
        businessId: business.id,
        tenantId: business.tenantId,
        ...(locationId ? { locationId } : {}),
      },
      relations: ['product', 'location'],
      order: { product: { name: 'ASC' } },
    });
  }

  async listMovements(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpStockMovement[]; total: number }> {
    const [items, total] = await this.movements.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(take, 100),
      skip,
      relations: ['product', 'location'],
    });
    return { items, total };
  }

  async createMovement(
    business: ErpBusiness,
    userId: string,
    dto: CreateStockMovementDto,
  ): Promise<ErpStockMovement> {
    const qtyN = parseFloat(dto.quantity);
    if (Number.isNaN(qtyN) || qtyN <= 0) {
      throw new BadRequestException('quantity deve ser um número > 0');
    }
    const product = await this.products.findOne({
      where: {
        id: dto.productId,
        businessId: business.id,
        tenantId: business.tenantId,
      },
    });
    if (!product) {
      throw new NotFoundException('Produto inválido para este negócio');
    }
    const loc = await this.locations.findOne({
      where: {
        id: dto.locationId,
        businessId: business.id,
        tenantId: business.tenantId,
      },
    });
    if (!loc) {
      throw new NotFoundException('Local de estoque inválido');
    }

    return this.dataSource.transaction(async (em) => {
      const mov = em.create(ErpStockMovement, {
        tenantId: business.tenantId,
        businessId: business.id,
        type: dto.type,
        productId: dto.productId,
        locationId: dto.locationId,
        quantity: dec(qtyN),
        refType: dto.refType?.trim() || null,
        refId: dto.refId ?? null,
        userId,
        note: dto.note?.trim() || null,
      });
      await em.save(mov);

      let bal = await em.findOne(ErpStockBalance, {
        where: {
          businessId: business.id,
          productId: dto.productId,
          locationId: dto.locationId,
        },
      });
      const cur = bal ? parseFloat(bal.quantity) : 0;
      let next: number;
      if (dto.type === 'in') {
        next = cur + qtyN;
      } else if (dto.type === 'out') {
        next = cur - qtyN;
      } else {
        next = qtyN;
      }
      if (next < 0) {
        throw new BadRequestException('Estoque insuficiente para esta saída');
      }
      if (!bal) {
        bal = em.create(ErpStockBalance, {
          tenantId: business.tenantId,
          businessId: business.id,
          productId: dto.productId,
          locationId: dto.locationId,
          quantity: dec(next),
        });
      } else {
        bal.quantity = dec(next);
      }
      await em.save(bal);
      return mov;
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
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

  async listMinimumAlerts(
    business: ErpBusiness,
  ): Promise<
    Array<{
      productId: string;
      sku: string;
      name: string;
      quantity: string;
      minStock: string;
      shortage: string;
    }>
  > {
    const rows = await this.balances
      .createQueryBuilder('balance')
      .innerJoin('balance.product', 'product')
      .select('balance.productId', 'productId')
      .addSelect('product.sku', 'sku')
      .addSelect('product.name', 'name')
      .addSelect('product.minStock', 'minStock')
      .addSelect('COALESCE(SUM(balance.quantity), 0)', 'quantity')
      .where('balance.businessId = :businessId', { businessId: business.id })
      .andWhere('balance.tenantId = :tenantId', { tenantId: business.tenantId })
      .groupBy('balance.productId')
      .addGroupBy('product.sku')
      .addGroupBy('product.name')
      .addGroupBy('product.minStock')
      .having('COALESCE(SUM(balance.quantity), 0) < product.minStock')
      .orderBy('product.name', 'ASC')
      .getRawMany<{
        productId: string;
        sku: string;
        name: string;
        quantity: string;
        minStock: string;
      }>();

    return rows.map((row) => ({
      ...row,
      shortage: dec(Math.max(0, parseFloat(row.minStock) - parseFloat(row.quantity))),
    }));
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

  async findDefaultLocation(
    business: ErpBusiness,
    manager?: EntityManager,
  ): Promise<ErpStockLocation> {
    const repo = manager ? manager.getRepository(ErpStockLocation) : this.locations;
    const location = await repo.findOne({
      where: {
        businessId: business.id,
        tenantId: business.tenantId,
        isDefault: true,
      },
    });
    if (!location) {
      throw new BadRequestException(
        'Defina um local de estoque padrão antes de registrar saldo.',
      );
    }
    return location;
  }

  async createMovement(
    business: ErpBusiness,
    userId: string,
    dto: CreateStockMovementDto,
  ): Promise<ErpStockMovement> {
    return this.createTrackedMovement({
      business,
      userId,
      type: dto.type,
      productId: dto.productId,
      locationId: dto.locationId,
      quantity: dto.quantity,
      refType: dto.refType,
      refId: dto.refId,
      note: dto.note,
    });
  }

  async createTrackedMovement(params: {
    business: ErpBusiness;
    type: 'in' | 'out' | 'adjust';
    productId: string;
    locationId: string;
    quantity: string;
    refType?: string | null;
    refId?: string | null;
    note?: string | null;
    userId?: string | null;
    manager?: EntityManager;
  }): Promise<ErpStockMovement> {
    const qtyN = parseFloat(params.quantity);
    if (Number.isNaN(qtyN) || qtyN <= 0) {
      throw new BadRequestException('quantity deve ser um número > 0');
    }

    const manager = params.manager;
    const productsRepo = manager ? manager.getRepository(ErpProduct) : this.products;
    const locationsRepo = manager ? manager.getRepository(ErpStockLocation) : this.locations;

    const product = await productsRepo.findOne({
      where: {
        id: params.productId,
        businessId: params.business.id,
        tenantId: params.business.tenantId,
      },
    });
    if (!product) {
      throw new NotFoundException('Produto inválido para este negócio');
    }
    if (product.kind !== 'product') {
      throw new BadRequestException('Apenas produtos físicos podem movimentar estoque');
    }

    const location = await locationsRepo.findOne({
      where: {
        id: params.locationId,
        businessId: params.business.id,
        tenantId: params.business.tenantId,
      },
    });
    if (!location) {
      throw new NotFoundException('Local de estoque inválido');
    }

    const persist = async (em: EntityManager) => {
      const movement = em.create(ErpStockMovement, {
        tenantId: params.business.tenantId,
        businessId: params.business.id,
        type: params.type,
        productId: params.productId,
        locationId: params.locationId,
        quantity: dec(qtyN),
        refType: params.refType?.trim() || null,
        refId: params.refId ?? null,
        userId: params.userId ?? null,
        note: params.note?.trim() || null,
      });
      await em.save(movement);

      let balance = await em.findOne(ErpStockBalance, {
        where: {
          businessId: params.business.id,
          tenantId: params.business.tenantId,
          productId: params.productId,
          locationId: params.locationId,
        },
      });
      const current = balance ? parseFloat(balance.quantity) : 0;
      let next: number;
      if (params.type === 'in') {
        next = current + qtyN;
      } else if (params.type === 'out') {
        next = current - qtyN;
      } else {
        next = qtyN;
      }

      if (next < 0) {
        throw new BadRequestException('Estoque insuficiente para esta saída');
      }

      if (!balance) {
        balance = em.create(ErpStockBalance, {
          tenantId: params.business.tenantId,
          businessId: params.business.id,
          productId: params.productId,
          locationId: params.locationId,
          quantity: dec(next),
        });
      } else {
        balance.quantity = dec(next);
      }
      await em.save(balance);
      return movement;
    };

    if (manager) {
      return persist(manager);
    }

    return this.dataSource.transaction(async (em) => persist(em));
  }
}

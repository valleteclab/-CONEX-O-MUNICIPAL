import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpParty } from '../../entities/erp-party.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import { ErpSalesOrderItem } from '../../entities/erp-sales-order-item.entity';
import {
  CreateSalesOrderDto,
  PatchSalesOrderStatusDto,
} from '../dto/sales-order.dto';
import { dec, decMul } from '../utils/decimal';

@Injectable()
export class ErpSalesOrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErpSalesOrder)
    private readonly orders: Repository<ErpSalesOrder>,
  ) {}

  async list(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpSalesOrder[]; total: number }> {
    const [items, total] = await this.orders.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(take, 100),
      skip,
      relations: ['party'],
    });
    return { items, total };
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpSalesOrder> {
    const row = await this.orders.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
      relations: ['items', 'items.product', 'party'],
    });
    if (!row) {
      throw new NotFoundException('Pedido de venda não encontrado');
    }
    return row;
  }

  async create(
    business: ErpBusiness,
    dto: CreateSalesOrderDto,
  ): Promise<ErpSalesOrder> {
    return this.dataSource.transaction(async (em) => {
      if (dto.partyId) {
        const party = await em.findOne(ErpParty, {
          where: {
            id: dto.partyId,
            businessId: business.id,
            tenantId: business.tenantId,
          },
        });
        if (!party) {
          throw new BadRequestException('Cliente (party) inválido');
        }
      }
      let total = 0;
      for (const line of dto.items) {
        const p = await em.findOne(ErpProduct, {
          where: {
            id: line.productId,
            businessId: business.id,
            tenantId: business.tenantId,
          },
        });
        if (!p) {
          throw new BadRequestException(`Produto ${line.productId} inválido`);
        }
        total += Number(decMul(line.qty, line.unitPrice));
      }
      const order = em.create(ErpSalesOrder, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: dto.partyId ?? null,
        status: 'draft',
        totalAmount: dec(total),
        note: dto.note?.trim() || null,
      });
      await em.save(order);
      for (const line of dto.items) {
        await em.save(
          em.create(ErpSalesOrderItem, {
            orderId: order.id,
            productId: line.productId,
            qty: dec(line.qty),
            unitPrice: dec(line.unitPrice),
          }),
        );
      }
      const full = await em.findOne(ErpSalesOrder, {
        where: { id: order.id },
        relations: ['items', 'items.product', 'party'],
      });
      if (!full) {
        throw new NotFoundException('Pedido recém-criado não encontrado');
      }
      return full;
    });
  }

  async patchStatus(
    business: ErpBusiness,
    id: string,
    dto: PatchSalesOrderStatusDto,
  ): Promise<ErpSalesOrder> {
    const row = await this.findOne(business, id);
    if (row.status === 'cancelled') {
      throw new BadRequestException('Pedido cancelado não pode ser alterado');
    }
    if (dto.status === 'draft') {
      throw new BadRequestException('Não é possível voltar para rascunho');
    }
    row.status = dto.status;
    await this.orders.save(row);
    return this.findOne(business, id);
  }
}

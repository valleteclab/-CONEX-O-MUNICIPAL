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
import { ErpPurchaseOrder } from '../../entities/erp-purchase-order.entity';
import { ErpPurchaseOrderItem } from '../../entities/erp-purchase-order-item.entity';
import {
  CreatePurchaseOrderDto,
  PatchPurchaseOrderStatusDto,
} from '../dto/purchase-order.dto';
import { dec, decMul } from '../utils/decimal';

@Injectable()
export class ErpPurchaseOrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErpPurchaseOrder)
    private readonly orders: Repository<ErpPurchaseOrder>,
  ) {}

  async list(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpPurchaseOrder[]; total: number }> {
    const [items, total] = await this.orders.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(take, 100),
      skip,
      relations: ['supplierParty'],
    });
    return { items, total };
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpPurchaseOrder> {
    const row = await this.orders.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
      relations: ['items', 'items.product', 'supplierParty'],
    });
    if (!row) {
      throw new NotFoundException('Pedido de compra não encontrado');
    }
    return row;
  }

  async create(
    business: ErpBusiness,
    dto: CreatePurchaseOrderDto,
  ): Promise<ErpPurchaseOrder> {
    return this.dataSource.transaction(async (em) => {
      const supplier = await em.findOne(ErpParty, {
        where: {
          id: dto.supplierPartyId,
          businessId: business.id,
          tenantId: business.tenantId,
        },
      });
      if (!supplier) {
        throw new BadRequestException('Fornecedor inválido');
      }
      if (supplier.type === 'customer') {
        throw new BadRequestException(
          'Fornecedor deve ser tipo supplier ou both',
        );
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
      const order = em.create(ErpPurchaseOrder, {
        tenantId: business.tenantId,
        businessId: business.id,
        supplierPartyId: dto.supplierPartyId,
        status: 'draft',
        totalAmount: dec(total),
        note: dto.note?.trim() || null,
      });
      await em.save(order);
      for (const line of dto.items) {
        await em.save(
          em.create(ErpPurchaseOrderItem, {
            orderId: order.id,
            productId: line.productId,
            qty: dec(line.qty),
            unitPrice: dec(line.unitPrice),
          }),
        );
      }
      const full = await em.findOne(ErpPurchaseOrder, {
        where: { id: order.id },
        relations: ['items', 'items.product', 'supplierParty'],
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
    dto: PatchPurchaseOrderStatusDto,
  ): Promise<ErpPurchaseOrder> {
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

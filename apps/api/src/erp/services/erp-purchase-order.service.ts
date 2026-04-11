import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpAccountPayable } from '../../entities/erp-account-payable.entity';
import { ErpParty } from '../../entities/erp-party.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { ErpPurchaseOrder } from '../../entities/erp-purchase-order.entity';
import { ErpPurchaseOrderItem } from '../../entities/erp-purchase-order-item.entity';
import { ErpStockBalance } from '../../entities/erp-stock-balance.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { ErpStockMovement } from '../../entities/erp-stock-movement.entity';
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
    await this.dataSource.transaction(async (em) => {
      const row = await em.findOne(ErpPurchaseOrder, {
        where: { id, businessId: business.id, tenantId: business.tenantId },
        relations: ['items', 'items.product', 'supplierParty'],
      });
      if (!row) {
        throw new NotFoundException('Pedido de compra não encontrado');
      }
      if (row.status === 'cancelled') {
        throw new BadRequestException('Pedido cancelado não pode ser alterado');
      }
      if (dto.status === 'draft') {
        throw new BadRequestException('Não é possível voltar para rascunho');
      }
      if (dto.status === 'received') {
        await this.postStock(em, business, row);
        await this.postPayable(em, business, row);
        row.stockPostedAt = new Date();
      }
      row.status = dto.status;
      await em.save(row);
    });
    return this.findOne(business, id);
  }

  private async postStock(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpPurchaseOrder,
  ): Promise<void> {
    if (order.stockPostedAt) {
      throw new BadRequestException('Estoque deste pedido já foi lançado');
    }
    const defaultLocation = await em.findOne(ErpStockLocation, {
      where: {
        businessId: business.id,
        tenantId: business.tenantId,
        isDefault: true,
      },
    });
    if (!defaultLocation) {
      throw new BadRequestException(
        'Defina um local de estoque padrão antes de receber o pedido',
      );
    }

    for (const item of order.items) {
      let balance = await em.findOne(ErpStockBalance, {
        where: {
          businessId: business.id,
          tenantId: business.tenantId,
          productId: item.productId,
          locationId: defaultLocation.id,
        },
      });
      const current = balance ? parseFloat(balance.quantity) : 0;
      const next = current + parseFloat(item.qty);

      await em.save(
        em.create(ErpStockMovement, {
          tenantId: business.tenantId,
          businessId: business.id,
          type: 'in',
          productId: item.productId,
          locationId: defaultLocation.id,
          quantity: dec(item.qty),
          refType: 'purchase_order',
          refId: order.id,
          userId: null,
          note: `Entrada automática do pedido ${order.id}`,
        }),
      );

      if (!balance) {
        balance = em.create(ErpStockBalance, {
          tenantId: business.tenantId,
          businessId: business.id,
          productId: item.productId,
          locationId: defaultLocation.id,
          quantity: dec(next),
        });
      } else {
        balance.quantity = dec(next);
      }
      await em.save(balance);
    }
  }

  private async postPayable(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpPurchaseOrder,
  ): Promise<void> {
    const existing = await em.findOne(ErpAccountPayable, {
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        linkRef: 'purchase_order',
        linkId: order.id,
      },
    });
    if (existing) {
      return;
    }

    await em.save(
      em.create(ErpAccountPayable, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: order.supplierPartyId,
        dueDate: order.createdAt.toISOString().slice(0, 10),
        amount: dec(order.totalAmount),
        status: 'open',
        linkRef: 'purchase_order',
        linkId: order.id,
        note: `Gerado automaticamente do pedido de compra ${order.id}`,
      }),
    );
  }
}

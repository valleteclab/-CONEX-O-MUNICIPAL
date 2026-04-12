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
      throw new NotFoundException('Pedido de compra nao encontrado');
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
        throw new BadRequestException('Fornecedor invalido');
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
          throw new BadRequestException(`Produto ${line.productId} invalido`);
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
        throw new NotFoundException('Pedido recem-criado nao encontrado');
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
        throw new NotFoundException('Pedido de compra nao encontrado');
      }
      if (row.status === 'cancelled') {
        throw new BadRequestException('Pedido cancelado nao pode ser alterado');
      }
      if (dto.status === 'draft') {
        throw new BadRequestException('Nao e possivel voltar para rascunho');
      }
      if (dto.status === 'received' && row.status !== 'received') {
        await this.postStock(em, business, row);
        await this.postPayable(em, business, row);
        row.stockPostedAt = new Date();
      }
      if (dto.status === 'cancelled' && row.status === 'received') {
        await this.reverseStock(em, business, row);
        await this.cancelPayable(em, business, row);
        row.stockPostedAt = null;
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
      throw new BadRequestException('Estoque deste pedido ja foi lancado');
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
        'Defina um local de estoque padrao antes de receber o pedido',
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
          note: `Entrada automatica do pedido ${order.id}`,
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

  private async reverseStock(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpPurchaseOrder,
  ): Promise<void> {
    if (!order.stockPostedAt) {
      return;
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
        'Defina um local de estoque padrao antes de cancelar a entrada.',
      );
    }

    for (const item of order.items) {
      const nome = item.product?.name ?? item.productId;
      let balance = await em.findOne(ErpStockBalance, {
        where: {
          businessId: business.id,
          tenantId: business.tenantId,
          productId: item.productId,
          locationId: defaultLocation.id,
        },
      });
      const current = balance ? parseFloat(balance.quantity) : 0;
      const need = parseFloat(item.qty);
      const next = current - need;
      if (next < 0) {
        throw new BadRequestException(
          `Nao ha saldo suficiente para cancelar a entrada de "${nome}". Disponivel: ${current}.`,
        );
      }

      await em.save(
        em.create(ErpStockMovement, {
          tenantId: business.tenantId,
          businessId: business.id,
          type: 'out',
          productId: item.productId,
          locationId: defaultLocation.id,
          quantity: dec(item.qty),
          refType: 'purchase_order_cancel',
          refId: order.id,
          userId: null,
          note: `Estorno da entrada do pedido ${order.id}`,
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

  private async cancelPayable(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpPurchaseOrder,
  ): Promise<void> {
    const payable = await em.findOne(ErpAccountPayable, {
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        linkRef: 'purchase_order',
        linkId: order.id,
      },
    });
    if (!payable || payable.status === 'cancelled') {
      return;
    }
    if (payable.status === 'paid') {
      throw new BadRequestException(
        'Esta entrada ja foi baixada no financeiro. Cancele ou estorne o pagamento antes de cancelar a entrada.',
      );
    }
    payable.status = 'cancelled';
    payable.note = `${payable.note ?? ''}\nCancelado automaticamente com o pedido ${order.id}.`
      .trim();
    await em.save(payable);
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpAccountReceivable } from '../../entities/erp-account-receivable.entity';
import { ErpParty } from '../../entities/erp-party.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { ErpStockBalance } from '../../entities/erp-stock-balance.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { ErpStockMovement } from '../../entities/erp-stock-movement.entity';
import {
  ErpSalesOrder,
  ErpSalesOrderSource,
} from '../../entities/erp-sales-order.entity';
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
    meta?: {
      source?: ErpSalesOrderSource;
      portalRequestId?: string | null;
    },
  ): Promise<ErpSalesOrder> {
    const source: ErpSalesOrderSource = meta?.source ?? 'erp';
    const portalRequestId = meta?.portalRequestId ?? null;
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
        source,
        paymentMethod: dto.paymentMethod ?? null,
        fiscalStatus: 'none',
        fiscalDocumentType: null,
        portalRequestId,
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
    await this.dataSource.transaction(async (em) => {
      const row = await em.findOne(ErpSalesOrder, {
        where: { id, businessId: business.id, tenantId: business.tenantId },
        relations: ['items', 'items.product', 'party'],
      });
      if (!row) {
        throw new NotFoundException('Pedido de venda não encontrado');
      }
      if (row.status === 'cancelled') {
        throw new BadRequestException('Pedido cancelado não pode ser alterado');
      }
      if (dto.status === 'draft') {
        throw new BadRequestException('Não é possível voltar para rascunho');
      }
      if (dto.status === 'confirmed' && row.status === 'draft') {
        await this.postStock(em, business, row);
        await this.postReceivable(em, business, row);
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
    order: ErpSalesOrder,
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
        'Defina um local de estoque padrão antes de confirmar o pedido',
      );
    }

    for (const item of order.items) {
      const nome = item.product?.name ?? item.productId;
      if (item.product?.kind === 'service') {
        continue;
      }

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
        if (!balance || current === 0) {
          throw new BadRequestException(
            `Sem saldo de estoque para "${nome}" no local padrão. Registre uma entrada em Estoque antes de confirmar, ou cadastre o item como serviço (sem baixa).`,
          );
        }
        throw new BadRequestException(
          `Estoque insuficiente para "${nome}". Disponível: ${current}.`,
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
          refType: 'sales_order',
          refId: order.id,
          userId: null,
          note: `Baixa automática do pedido ${order.id}`,
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

  private async postReceivable(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpSalesOrder,
  ): Promise<void> {
    if (!order.partyId) {
      return;
    }

    const existing = await em.findOne(ErpAccountReceivable, {
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        linkRef: 'sales_order',
        linkId: order.id,
      },
    });
    if (existing) {
      return;
    }

    await em.save(
      em.create(ErpAccountReceivable, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: order.partyId,
        dueDate: order.createdAt.toISOString().slice(0, 10),
        amount: dec(order.totalAmount),
        status: 'open',
        linkRef: 'sales_order',
        linkId: order.id,
        note: `Gerado automaticamente do pedido de venda ${order.id}`,
      }),
    );
  }
}

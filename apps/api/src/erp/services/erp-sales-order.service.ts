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
import { ErpFiscalDocument } from '../../entities/erp-fiscal-document.entity';
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
  CancelSalesOrderDto,
  CreateSalesOrderDto,
  PatchSalesOrderStatusDto,
} from '../dto/sales-order.dto';
import { dec, decMul } from '../utils/decimal';
import { ErpFiscalService } from './erp-fiscal.service';

@Injectable()
export class ErpSalesOrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fiscal: ErpFiscalService,
    @InjectRepository(ErpSalesOrder)
    private readonly orders: Repository<ErpSalesOrder>,
    @InjectRepository(ErpFiscalDocument)
    private readonly fiscalDocs: Repository<ErpFiscalDocument>,
    @InjectRepository(ErpAccountReceivable)
    private readonly receivables: Repository<ErpAccountReceivable>,
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
      throw new NotFoundException('Pedido de venda nao encontrado');
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
          throw new BadRequestException('Cliente (party) invalido');
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
          throw new BadRequestException(`Produto ${line.productId} invalido`);
        }
        total += Number(decMul(line.qty, line.unitPrice));
      }
      const order = em.create(ErpSalesOrder, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: dto.partyId ?? null,
        status: 'draft',
        commercialStatus: 'draft',
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
        throw new NotFoundException('Pedido recem-criado nao encontrado');
      }
      return full;
    });
  }

  async validateCancellation(
    business: ErpBusiness,
    id: string,
  ): Promise<void> {
    const order = await this.findOne(business, id);
    await this.assertSaleCanBeCancelled(business, order);
  }

  async patchStatus(
    business: ErpBusiness,
    id: string,
    dto: PatchSalesOrderStatusDto,
  ): Promise<ErpSalesOrder> {
    if (dto.status === 'cancelled' && dto.cancelFiscalDocument) {
      const order = await this.findOne(business, id);
      await this.assertSaleCanBeCancelled(business, order);
      if (order.fiscalStatus === 'authorized') {
        const linkedDoc = await this.fiscalDocs.findOne({
          where: {
            tenantId: business.tenantId,
            businessId: business.id,
            salesOrderId: id,
          },
          order: { createdAt: 'DESC' },
        });
        if (!linkedDoc) {
          throw new NotFoundException(
            'Nao foi encontrado o documento fiscal vinculado a esta venda.',
          );
        }
        await this.fiscal.cancel(business, linkedDoc.id, {
          reason: 'Cancelamento da venda solicitado no ERP.',
        });
      }
    }

    await this.dataSource.transaction(async (em) => {
      const row = await em.findOne(ErpSalesOrder, {
        where: { id, businessId: business.id, tenantId: business.tenantId },
        relations: ['items', 'items.product', 'party'],
      });
      if (!row) {
        throw new NotFoundException('Pedido de venda nao encontrado');
      }
      if (row.status === 'cancelled') {
        throw new BadRequestException('Pedido cancelado nao pode ser alterado');
      }
      if (dto.status === 'draft') {
        throw new BadRequestException('Nao e possivel voltar para rascunho');
      }
      if (dto.status === 'confirmed' && row.status === 'draft') {
        await this.postStock(em, business, row);
        await this.postReceivable(em, business, row);
        row.stockPostedAt = new Date();
        row.commercialStatus = 'confirmed';
      }
      if (dto.status === 'cancelled') {
        if (row.fiscalStatus === 'pending') {
          throw new BadRequestException(
            'Esta venda tem emissao fiscal pendente. Atualize ou cancele a nota antes de cancelar a venda.',
          );
        }
        if (row.fiscalStatus === 'authorized') {
          throw new BadRequestException(
            'Cancele a nota fiscal vinculada antes de cancelar a venda.',
          );
        }
        if (row.status === 'confirmed') {
          await this.reverseStock(em, business, row);
          await this.cancelReceivable(em, business, row);
          row.stockPostedAt = null;
        }
        row.commercialStatus = 'cancelled';
      }
      row.status = dto.status;
      await em.save(row);
    });
    return this.findOne(business, id);
  }

  async cancelOrder(
    business: ErpBusiness,
    id: string,
    dto: CancelSalesOrderDto,
  ): Promise<ErpSalesOrder> {
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Informe o motivo do cancelamento da venda.');
    }

    const order = await this.findOne(business, id);
    await this.assertSaleCanBeCancelled(business, order);

    if (order.fiscalStatus === 'authorized') {
      if (dto.cancelFiscalIfPossible === false) {
        throw new BadRequestException(
          'Esta venda possui documento fiscal autorizado. Cancele a nota fiscal antes de cancelar a venda.',
        );
      }
      const linkedDoc = await this.fiscalDocs.findOne({
        where: {
          tenantId: business.tenantId,
          businessId: business.id,
          salesOrderId: id,
          purpose: 'sale',
        },
        order: { createdAt: 'DESC' },
      });
      if (!linkedDoc) {
        throw new NotFoundException(
          'Nao foi encontrado o documento fiscal vinculado a esta venda.',
        );
      }
      await this.fiscal.cancel(business, linkedDoc.id, { reason });
    }

    return this.patchStatus(business, id, { status: 'cancelled' });
  }

  private async postStock(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpSalesOrder,
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
        'Defina um local de estoque padrao antes de confirmar o pedido',
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
            `Sem saldo de estoque para "${nome}" no local padrao. Registre uma entrada em Estoque antes de confirmar, ou cadastre o item como servico (sem baixa).`,
          );
        }
        throw new BadRequestException(
          `Estoque insuficiente para "${nome}". Disponivel: ${current}.`,
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
          note: `Baixa automatica do pedido ${order.id}`,
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

  private async reverseStock(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpSalesOrder,
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
        'Defina um local de estoque padrao antes de cancelar a venda.',
      );
    }

    for (const item of order.items) {
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
      const next = current + parseFloat(item.qty);

      await em.save(
        em.create(ErpStockMovement, {
          tenantId: business.tenantId,
          businessId: business.id,
          type: 'in',
          productId: item.productId,
          locationId: defaultLocation.id,
          quantity: dec(item.qty),
          refType: 'sales_order_cancel',
          refId: order.id,
          userId: null,
          note: `Estorno de estoque da venda ${order.id}`,
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

  private async cancelReceivable(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpSalesOrder,
  ): Promise<void> {
    const receivable = await em.findOne(ErpAccountReceivable, {
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        linkRef: 'sales_order',
        linkId: order.id,
      },
    });
    if (!receivable || receivable.status === 'cancelled') {
      return;
    }
    if (receivable.status === 'paid') {
      throw new BadRequestException(
        'Esta venda ja foi baixada no financeiro. Cancele ou estorne o recebimento antes de cancelar a venda.',
      );
    }
    receivable.status = 'cancelled';
    receivable.note = `${receivable.note ?? ''}\nCancelado automaticamente com a venda ${order.id}.`
      .trim();
    await em.save(receivable);
  }

  private async assertSaleCanBeCancelled(
    business: ErpBusiness,
    order: ErpSalesOrder,
  ): Promise<void> {
    if (order.status === 'cancelled') {
      throw new BadRequestException('Pedido cancelado nao pode ser alterado');
    }
    if (order.status !== 'confirmed') {
      return;
    }

    const receivable = await this.receivables.findOne({
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        linkRef: 'sales_order',
        linkId: order.id,
      },
    });
    if (receivable?.status === 'paid') {
      throw new BadRequestException(
        'Esta venda ja foi baixada no financeiro. Cancele ou estorne o recebimento antes de cancelar a venda.',
      );
    }
  }
}

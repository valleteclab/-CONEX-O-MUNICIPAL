import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErpAccountReceivable } from '../../entities/erp-account-receivable.entity';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpBusinessUser } from '../../entities/erp-business-user.entity';
import { ErpParty } from '../../entities/erp-party.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { ErpQuote } from '../../entities/erp-quote.entity';
import {
  ErpServiceOrder,
  ErpServiceOrderStatus,
} from '../../entities/erp-service-order.entity';
import { ErpServiceOrderItem } from '../../entities/erp-service-order-item.entity';
import { ErpStockBalance } from '../../entities/erp-stock-balance.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { ErpStockMovement } from '../../entities/erp-stock-movement.entity';
import {
  CreateServiceOrderDto,
  PatchServiceOrderStatusDto,
} from '../dto/service-order.dto';
import { dec, decMul } from '../utils/decimal';

@Injectable()
export class ErpServiceOrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErpServiceOrder)
    private readonly orders: Repository<ErpServiceOrder>,
  ) {}

  async list(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpServiceOrder[]; total: number }> {
    const [items, total] = await this.orders.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(take, 100),
      skip,
      relations: [
        'party',
        'assignedUser',
        'createdByUser',
        'startedByUser',
        'completedByUser',
        'cancelledByUser',
      ],
    });
    return { items, total };
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpServiceOrder> {
    const row = await this.orders.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
      relations: [
        'items',
        'items.product',
        'party',
        'assignedUser',
        'createdByUser',
        'startedByUser',
        'completedByUser',
        'cancelledByUser',
      ],
    });
    if (!row) {
      throw new NotFoundException('Ordem de serviço não encontrada');
    }
    return row;
  }

  async create(
    business: ErpBusiness,
    dto: CreateServiceOrderDto,
    actorUserId?: string,
  ): Promise<ErpServiceOrder> {
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

      if (dto.quoteId) {
        const quote = await em.findOne(ErpQuote, {
          where: {
            id: dto.quoteId,
            businessId: business.id,
            tenantId: business.tenantId,
          },
        });
        if (!quote) {
          throw new BadRequestException('Orçamento informado é inválido');
        }
      }

      if (dto.assignedUserId) {
        const member = await em.findOne(ErpBusinessUser, {
          where: {
            userId: dto.assignedUserId,
            businessId: business.id,
          },
          relations: ['user'],
        });
        if (!member || !member.user?.isActive) {
          throw new BadRequestException('Responsavel informado e invalido');
        }
      }

      let total = 0;
      for (const line of dto.items) {
        const product = await em.findOne(ErpProduct, {
          where: {
            id: line.productId,
            businessId: business.id,
            tenantId: business.tenantId,
          },
        });
        if (!product) {
          throw new BadRequestException(`Produto ${line.productId} inválido`);
        }
        total += Number(decMul(line.qty, line.unitPrice));
      }

      const order = em.create(ErpServiceOrder, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: dto.partyId ?? null,
        quoteId: dto.quoteId ?? null,
        title: dto.title.trim(),
        createdByUserId: actorUserId ?? null,
        status: dto.scheduledFor ? 'scheduled' : 'draft',
        priority: dto.priority ?? 'medium',
        serviceCategory: dto.serviceCategory?.trim() || null,
        description: dto.description?.trim() || null,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
        promisedFor: dto.promisedFor ? new Date(dto.promisedFor) : null,
        assignedTo: dto.assignedTo?.trim() || null,
        assignedUserId: dto.assignedUserId ?? null,
        contactName: dto.contactName?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        serviceLocation: dto.serviceLocation?.trim() || null,
        serviceAddress: { ...(dto.serviceAddress ?? {}) },
        diagnosis: dto.diagnosis?.trim() || null,
        resolution: dto.resolution?.trim() || null,
        checklist: (dto.checklist ?? []).map((item) => item.trim()).filter(Boolean),
        totalAmount: dec(total),
        note: dto.note?.trim() || null,
      });
      await em.save(order);

      for (const line of dto.items) {
        await em.save(
          em.create(ErpServiceOrderItem, {
            serviceOrderId: order.id,
            productId: line.productId,
            qty: dec(line.qty),
            unitPrice: dec(line.unitPrice),
          }),
        );
      }

      const full = await em.findOne(ErpServiceOrder, {
        where: { id: order.id },
        relations: [
          'items',
          'items.product',
          'party',
          'assignedUser',
          'createdByUser',
          'startedByUser',
          'completedByUser',
          'cancelledByUser',
        ],
      });
      if (!full) {
        throw new NotFoundException('Ordem de serviço recém-criada não encontrada');
      }
      return full;
    });
  }

  async patchStatus(
    business: ErpBusiness,
    id: string,
    dto: PatchServiceOrderStatusDto,
    actorUserId?: string,
  ): Promise<ErpServiceOrder> {
    const allowedTransitions: Record<ErpServiceOrderStatus, ErpServiceOrderStatus[]> = {
      draft: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      scheduled: ['in_progress', 'completed', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };

    await this.dataSource.transaction(async (em) => {
      const row = await em.findOne(ErpServiceOrder, {
        where: { id, businessId: business.id, tenantId: business.tenantId },
        relations: [
          'items',
          'items.product',
          'party',
          'assignedUser',
          'createdByUser',
          'startedByUser',
          'completedByUser',
          'cancelledByUser',
        ],
      });
      if (!row) {
        throw new NotFoundException('Ordem de serviço não encontrada');
      }
      if (!allowedTransitions[row.status].includes(dto.status)) {
        throw new BadRequestException('Transição de status inválida para esta OS');
      }
      if (dto.status === 'completed') {
        await this.postStock(em, business, row);
        await this.postReceivable(em, business, row);
        row.startedAt = row.startedAt ?? new Date();
        row.startedByUserId = row.startedByUserId ?? actorUserId ?? null;
        row.completedAt = row.completedAt ?? new Date();
        row.completedByUserId = actorUserId ?? row.completedByUserId;
        row.stockPostedAt = row.stockPostedAt ?? new Date();
        row.receivablePostedAt = row.receivablePostedAt ?? new Date();
      }
      if (dto.status === 'in_progress') {
        row.startedAt = row.startedAt ?? new Date();
        row.startedByUserId = row.startedByUserId ?? actorUserId ?? null;
      }
      if (dto.status === 'cancelled') {
        row.cancelledAt = row.cancelledAt ?? new Date();
        row.cancelledByUserId = actorUserId ?? row.cancelledByUserId;
        row.cancellationReason = dto.cancellationReason?.trim() || row.cancellationReason;
      }
      row.status = dto.status;
      await em.save(row);
    });

    return this.findOne(business, id);
  }

  private async postStock(
    em: EntityManager,
    business: ErpBusiness,
    order: ErpServiceOrder,
  ): Promise<void> {
    if (order.stockPostedAt) {
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
        'Defina um local de estoque padrão antes de concluir a ordem de serviço',
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
        throw new BadRequestException(
          `Estoque insuficiente para "${nome}" na conclusão da OS.`,
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
          refType: 'service_order',
          refId: order.id,
          userId: null,
          note: `Baixa automática da ordem de serviço ${order.id}`,
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
    order: ErpServiceOrder,
  ): Promise<void> {
    if (!order.partyId || order.receivablePostedAt) {
      return;
    }

    const existing = await em.findOne(ErpAccountReceivable, {
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        linkRef: 'service_order',
        linkId: order.id,
      },
    });
    if (existing) {
      return;
    }

    const dueDateSource = order.scheduledFor ?? order.createdAt;
    await em.save(
      em.create(ErpAccountReceivable, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: order.partyId,
        dueDate: dueDateSource.toISOString().slice(0, 10),
        amount: dec(order.totalAmount),
        status: 'open',
        linkRef: 'service_order',
        linkId: order.id,
        note: `Gerado automaticamente da ordem de serviço ${order.title}`,
      }),
    );
  }
}

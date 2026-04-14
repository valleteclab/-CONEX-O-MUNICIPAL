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
import { ErpQuote, ErpQuoteSource, ErpQuoteStatus } from '../../entities/erp-quote.entity';
import { ErpQuoteItem } from '../../entities/erp-quote-item.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import { ErpSalesOrderItem } from '../../entities/erp-sales-order-item.entity';
import { ErpServiceOrder } from '../../entities/erp-service-order.entity';
import { ErpServiceOrderItem } from '../../entities/erp-service-order-item.entity';
import {
  CreateQuoteDto,
  PatchQuoteStatusDto,
} from '../dto/quote.dto';
import { dec, decMul } from '../utils/decimal';

@Injectable()
export class ErpQuoteService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErpQuote)
    private readonly quotes: Repository<ErpQuote>,
  ) {}

  async list(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpQuote[]; total: number }> {
    const [items, total] = await this.quotes.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(take, 100),
      skip,
      relations: ['party'],
    });
    return { items, total };
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpQuote> {
    const row = await this.quotes.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
      relations: ['items', 'items.product', 'party'],
    });
    if (!row) {
      throw new NotFoundException('Orçamento não encontrado');
    }
    return row;
  }

  async create(
    business: ErpBusiness,
    dto: CreateQuoteDto,
  ): Promise<ErpQuote> {
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

      const quote = em.create(ErpQuote, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: dto.partyId ?? null,
        title: dto.title.trim(),
        status: 'draft',
        source: (dto.source ?? 'erp') as ErpQuoteSource,
        validUntil: dto.validUntil ?? null,
        totalAmount: dec(total),
        note: dto.note?.trim() || null,
      });
      await em.save(quote);

      for (const line of dto.items) {
        await em.save(
          em.create(ErpQuoteItem, {
            quoteId: quote.id,
            productId: line.productId,
            qty: dec(line.qty),
            unitPrice: dec(line.unitPrice),
          }),
        );
      }

      const full = await em.findOne(ErpQuote, {
        where: { id: quote.id },
        relations: ['items', 'items.product', 'party'],
      });
      if (!full) {
        throw new NotFoundException('Orçamento recém-criado não encontrado');
      }
      return full;
    });
  }

  async patchStatus(
    business: ErpBusiness,
    id: string,
    dto: PatchQuoteStatusDto,
  ): Promise<ErpQuote> {
    const allowedTransitions: Record<ErpQuoteStatus, ErpQuoteStatus[]> = {
      draft: ['sent', 'cancelled'],
      sent: ['approved', 'rejected', 'cancelled'],
      approved: ['converted', 'cancelled'],
      rejected: [],
      converted: [],
      cancelled: [],
    };

    const row = await this.findOne(business, id);
    if (!allowedTransitions[row.status].includes(dto.status)) {
      throw new BadRequestException('Transição de status inválida para este orçamento');
    }
    row.status = dto.status;
    await this.quotes.save(row);
    return this.findOne(business, id);
  }

  async convertToSalesOrder(
    business: ErpBusiness,
    id: string,
  ): Promise<ErpQuote> {
    await this.dataSource.transaction(async (em) => {
      const quote = await em.findOne(ErpQuote, {
        where: { id, businessId: business.id, tenantId: business.tenantId },
        relations: ['items', 'items.product'],
      });
      if (!quote) {
        throw new NotFoundException('Orçamento não encontrado');
      }
      if (quote.status === 'converted') {
        throw new BadRequestException('Este orçamento já foi convertido');
      }
      if (!['approved', 'sent', 'draft'].includes(quote.status)) {
        throw new BadRequestException('Somente orçamentos válidos podem ser convertidos');
      }

      const order = em.create(ErpSalesOrder, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: quote.partyId,
        status: 'draft',
        totalAmount: dec(quote.totalAmount),
        note: `Gerado a partir do orçamento ${quote.title}`,
        source: 'erp',
        portalRequestId: null,
      });
      await em.save(order);

      for (const item of quote.items) {
        await em.save(
          em.create(ErpSalesOrderItem, {
            orderId: order.id,
            productId: item.productId,
            qty: dec(item.qty),
            unitPrice: dec(item.unitPrice),
          }),
        );
      }

      quote.status = 'converted';
      quote.convertedSalesOrderId = order.id;
      await em.save(quote);
    });

    return this.findOne(business, id);
  }

  async convertToServiceOrder(
    business: ErpBusiness,
    id: string,
    actorUserId?: string,
  ): Promise<ErpQuote> {
    await this.dataSource.transaction(async (em) => {
      const quote = await em.findOne(ErpQuote, {
        where: { id, businessId: business.id, tenantId: business.tenantId },
        relations: ['items', 'items.product'],
      });
      if (!quote) {
        throw new NotFoundException('Orçamento não encontrado');
      }
      if (quote.status === 'converted') {
        throw new BadRequestException('Este orçamento já foi convertido');
      }
      if (!['approved', 'sent', 'draft'].includes(quote.status)) {
        throw new BadRequestException('Somente orçamentos válidos podem ser convertidos');
      }

      const order = em.create(ErpServiceOrder, {
        tenantId: business.tenantId,
        businessId: business.id,
        partyId: quote.partyId,
        quoteId: quote.id,
        title: quote.title,
        createdByUserId: actorUserId ?? null,
        status: 'draft',
        priority: 'medium',
        serviceCategory: null,
        description: quote.note,
        scheduledFor: null,
        promisedFor: null,
        assignedTo: null,
        assignedUserId: null,
        contactName: null,
        contactPhone: null,
        serviceLocation: null,
        serviceAddress: {},
        diagnosis: null,
        resolution: null,
        checklist: [],
        totalAmount: dec(quote.totalAmount),
        note: `Gerado a partir do orçamento ${quote.title}`,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
      });
      await em.save(order);

      for (const item of quote.items) {
        await em.save(
          em.create(ErpServiceOrderItem, {
            serviceOrderId: order.id,
            productId: item.productId,
            qty: dec(item.qty),
            unitPrice: dec(item.unitPrice),
          }),
        );
      }

      quote.status = 'converted';
      quote.convertedServiceOrderId = order.id;
      await em.save(quote);
    });

    return this.findOne(business, id);
  }
}

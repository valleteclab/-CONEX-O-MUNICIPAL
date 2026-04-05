import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { ErpAccountPayable } from '../../entities/erp-account-payable.entity';
import { ErpAccountReceivable } from '../../entities/erp-account-receivable.entity';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpCashEntry } from '../../entities/erp-cash-entry.entity';
import { ErpParty } from '../../entities/erp-party.entity';
import {
  CreateAccountPayableDto,
  CreateAccountReceivableDto,
  CreateCashEntryDto,
  FinanceSummaryQueryDto,
  PatchFinanceStatusDto,
} from '../dto/finance.dto';
import { dec } from '../utils/decimal';

@Injectable()
export class ErpFinanceService {
  constructor(
    @InjectRepository(ErpAccountReceivable)
    private readonly ar: Repository<ErpAccountReceivable>,
    @InjectRepository(ErpAccountPayable)
    private readonly ap: Repository<ErpAccountPayable>,
    @InjectRepository(ErpCashEntry)
    private readonly cash: Repository<ErpCashEntry>,
    @InjectRepository(ErpParty)
    private readonly parties: Repository<ErpParty>,
  ) {}

  // ——— Contas a receber ———

  async listAr(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpAccountReceivable[]; total: number }> {
    const [items, total] = await this.ar.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { dueDate: 'ASC' },
      take: Math.min(take, 100),
      skip,
      relations: ['party'],
    });
    return { items, total };
  }

  async createAr(
    business: ErpBusiness,
    dto: CreateAccountReceivableDto,
  ): Promise<ErpAccountReceivable> {
    await this.ensureParty(business, dto.partyId);
    const row = this.ar.create({
      tenantId: business.tenantId,
      businessId: business.id,
      partyId: dto.partyId,
      dueDate: dto.dueDate,
      amount: dec(dto.amount),
      status: 'open',
      linkRef: dto.linkRef?.trim() || null,
      linkId: dto.linkId ?? null,
      note: dto.note?.trim() || null,
    });
    return this.ar.save(row);
  }

  async patchArStatus(
    business: ErpBusiness,
    id: string,
    dto: PatchFinanceStatusDto,
  ): Promise<ErpAccountReceivable> {
    const row = await this.ar.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
    });
    if (!row) {
      throw new NotFoundException('Título a receber não encontrado');
    }
    row.status = dto.status;
    return this.ar.save(row);
  }

  // ——— Contas a pagar ———

  async listAp(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpAccountPayable[]; total: number }> {
    const [items, total] = await this.ap.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { dueDate: 'ASC' },
      take: Math.min(take, 100),
      skip,
      relations: ['party'],
    });
    return { items, total };
  }

  async createAp(
    business: ErpBusiness,
    dto: CreateAccountPayableDto,
  ): Promise<ErpAccountPayable> {
    await this.ensureParty(business, dto.partyId);
    const row = this.ap.create({
      tenantId: business.tenantId,
      businessId: business.id,
      partyId: dto.partyId,
      dueDate: dto.dueDate,
      amount: dec(dto.amount),
      status: 'open',
      linkRef: dto.linkRef?.trim() || null,
      linkId: dto.linkId ?? null,
      note: dto.note?.trim() || null,
    });
    return this.ap.save(row);
  }

  async patchApStatus(
    business: ErpBusiness,
    id: string,
    dto: PatchFinanceStatusDto,
  ): Promise<ErpAccountPayable> {
    const row = await this.ap.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
    });
    if (!row) {
      throw new NotFoundException('Título a pagar não encontrado');
    }
    row.status = dto.status;
    return this.ap.save(row);
  }

  // ——— Caixa ———

  async listCash(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpCashEntry[]; total: number }> {
    const [items, total] = await this.cash.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { occurredAt: 'DESC' },
      take: Math.min(take, 100),
      skip,
    });
    return { items, total };
  }

  async createCash(
    business: ErpBusiness,
    dto: CreateCashEntryDto,
  ): Promise<ErpCashEntry> {
    const row = this.cash.create({
      tenantId: business.tenantId,
      businessId: business.id,
      type: dto.type,
      amount: dec(dto.amount),
      category: dto.category.trim(),
      occurredAt: new Date(dto.occurredAt),
      description: dto.description?.trim() || null,
    });
    return this.cash.save(row);
  }

  async summary(business: ErpBusiness, query: FinanceSummaryQueryDto) {
    const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : null;
    const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : null;

    const cashWhere = {
      businessId: business.id,
      tenantId: business.tenantId,
      ...(from && to ? { occurredAt: Between(from, to) } : {}),
    };

    const [cashEntries, openAr, openAp] = await Promise.all([
      this.cash.find({ where: cashWhere }),
      this.ar.find({
        where: {
          businessId: business.id,
          tenantId: business.tenantId,
          status: 'open',
        },
      }),
      this.ap.find({
        where: {
          businessId: business.id,
          tenantId: business.tenantId,
          status: 'open',
        },
      }),
    ]);

    let cashIn = 0;
    let cashOut = 0;
    for (const entry of cashEntries) {
      const amount = parseFloat(entry.amount);
      if (entry.type === 'in') {
        cashIn += amount;
      } else {
        cashOut += amount;
      }
    }

    const receivablesOpen = openAr.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const payablesOpen = openAp.reduce((sum, row) => sum + parseFloat(row.amount), 0);

    return {
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
      },
      cash: {
        entries: cashEntries.length,
        totalIn: dec(cashIn),
        totalOut: dec(cashOut),
        balance: dec(cashIn - cashOut),
      },
      receivables: {
        openCount: openAr.length,
        openAmount: dec(receivablesOpen),
      },
      payables: {
        openCount: openAp.length,
        openAmount: dec(payablesOpen),
      },
    };
  }

  private async ensureParty(business: ErpBusiness, partyId: string): Promise<void> {
    const p = await this.parties.findOne({
      where: {
        id: partyId,
        businessId: business.id,
        tenantId: business.tenantId,
      },
    });
    if (!p) {
      throw new NotFoundException('Parte (cliente/fornecedor) inválida');
    }
  }
}

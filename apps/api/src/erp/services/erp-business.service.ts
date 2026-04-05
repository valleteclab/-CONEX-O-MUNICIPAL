import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpBusinessUser } from '../../entities/erp-business-user.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { CreateErpBusinessDto } from '../dto/create-business.dto';

@Injectable()
export class ErpBusinessService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErpBusiness)
    private readonly businesses: Repository<ErpBusiness>,
    @InjectRepository(ErpBusinessUser)
    private readonly members: Repository<ErpBusinessUser>,
  ) {}

  async listForUser(userId: string, tenantId: string): Promise<ErpBusiness[]> {
    const rows = await this.members
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.business', 'b')
      .where('m.user_id = :uid', { uid: userId })
      .andWhere('b.tenant_id = :tid', { tid: tenantId })
      .orderBy('b.trade_name', 'ASC')
      .getMany();
    return rows.map((r) => r.business);
  }

  async create(
    userId: string,
    tenantId: string,
    dto: CreateErpBusinessDto,
  ): Promise<ErpBusiness> {
    return this.dataSource.transaction(async (em) => {
      const b = em.create(ErpBusiness, {
        tenantId,
        tradeName: dto.tradeName.trim(),
        legalName: dto.legalName?.trim() || null,
        document: dto.document?.replace(/\D/g, '') || null,
        moderationStatus: 'pending',
        isActive: false,
      });
      await em.save(b);
      await em.save(
        em.create(ErpBusinessUser, {
          userId,
          businessId: b.id,
          role: 'empresa_owner',
        }),
      );
      await em.save(
        em.create(ErpStockLocation, {
          tenantId,
          businessId: b.id,
          name: 'Principal',
          isDefault: true,
        }),
      );
      return b;
    });
  }
}

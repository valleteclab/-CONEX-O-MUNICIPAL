import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpBusinessUser } from '../../entities/erp-business-user.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { isCnpjKind, parseFiscalDocument } from '../../common/fiscal-document';
import { Tenant } from '../../entities/tenant.entity';
import { User } from '../../entities/user.entity';
import { UserTenant } from '../../entities/user-tenant.entity';
import { PublicBusinessSignupDto } from '../dto/public-business-signup.dto';
import { IbgeCityService } from './ibge-city.service';

@Injectable()
export class ErpPublicSignupService {
  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly ibgeCities: IbgeCityService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Tenant)
    private readonly tenants: Repository<Tenant>,
    @InjectRepository(UserTenant)
    private readonly userTenants: Repository<UserTenant>,
    @InjectRepository(ErpBusiness)
    private readonly businesses: Repository<ErpBusiness>,
  ) {}

  async createSignup(dto: PublicBusinessSignupDto) {
    const tenant = await this.resolveDefaultTenant();
    const email = dto.responsibleEmail.toLowerCase().trim();
    const parsedDocument = parseFiscalDocument(dto.document);
    if (!parsedDocument.isValid || !isCnpjKind(parsedDocument.kind)) {
      throw new BadRequestException(
        'Informe um CNPJ valido para cadastrar a empresa.',
      );
    }
    const document = parsedDocument.normalized;

    const existingBusiness = await this.businesses.findOne({ where: { tenantId: tenant.id, document } });
    if (existingBusiness) {
      throw new BadRequestException('Já existe um cadastro empresarial para este CNPJ neste município.');
    }

    const existingUser = await this.users.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('Já existe um usuário com este e-mail. Faça login para continuar o cadastro.');
    }

    const city = await this.ibgeCities.findByCode(dto.cityIbgeCode);
    if (!city) {
      throw new BadRequestException('Cidade IBGE não encontrada. Selecione um município válido.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const business = await this.dataSource.transaction(async (em) => {
      const user = em.create(User, {
        email,
        fullName: dto.responsibleName.trim(),
        phone: dto.responsiblePhone?.trim() || null,
        passwordHash,
        role: 'company',
        emailVerified: false,
        phoneVerified: false,
        metadata: {
          source: 'public_business_signup',
        },
      });
      await em.save(user);

      await em.save(
        em.create(UserTenant, {
          userId: user.id,
          tenantId: tenant.id,
          role: 'company',
          isActive: true,
        }),
      );

      const createdBusiness = em.create(ErpBusiness, {
        tenantId: tenant.id,
        tradeName: dto.tradeName.trim(),
        legalName: dto.legalName.trim(),
        responsibleName: dto.responsibleName.trim(),
        responsibleEmail: email,
        responsiblePhone: dto.responsiblePhone?.trim() || null,
        document,
        address: {
          ...(dto.address ?? {}),
          city: city.name,
          uf: city.state,
        },
        inscricaoMunicipal: dto.inscricaoMunicipal?.trim() || null,
        inscricaoEstadual: dto.inscricaoEstadual?.trim() || null,
        cityIbgeCode: city.code,
        taxRegime: dto.taxRegime,
        fiscalConfig: {
          ...(dto.fiscalConfig ?? {}),
          publicSignup: {
            submittedAt: new Date().toISOString(),
          },
        },
        moderationStatus: 'pending',
        isActive: false,
      });
      await em.save(createdBusiness);

      await em.save(
        em.create(ErpBusinessUser, {
          userId: user.id,
          businessId: createdBusiness.id,
          role: 'empresa_owner',
        }),
      );

      await em.save(
        em.create(ErpStockLocation, {
          tenantId: tenant.id,
          businessId: createdBusiness.id,
          name: 'Principal',
          isDefault: true,
        }),
      );

      return createdBusiness;
    });

    return {
      businessId: business.id,
      moderationStatus: business.moderationStatus,
      message:
        'Cadastro recebido com sucesso. A equipe da plataforma vai analisar os dados da empresa antes de liberar o ERP.',
    };
  }

  private async resolveDefaultTenant(): Promise<Tenant> {
    const slug = this.config.get<string>('tenant.defaultSlug', { infer: true })!;
    const tenant = await this.tenants.findOne({ where: { slug } });
    if (!tenant) {
      throw new BadRequestException(`Tenant padrão não encontrado: ${slug}`);
    }
    return tenant;
  }
}

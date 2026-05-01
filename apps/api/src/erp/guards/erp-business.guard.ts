import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isAuthUserContext } from '../../auth/auth-user-context';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpBusinessUser } from '../../entities/erp-business-user.entity';

/**
 * Exige header `X-Business-Id` e vínculo do usuário ao negócio no mesmo tenant do JWT.
 */
@Injectable()
export class ErpBusinessGuard implements CanActivate {
  constructor(
    @InjectRepository(ErpBusiness)
    private readonly businesses: Repository<ErpBusiness>,
    @InjectRepository(ErpBusinessUser)
    private readonly members: Repository<ErpBusinessUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ctx = req.user;
    if (!isAuthUserContext(ctx)) {
      throw new UnauthorizedException();
    }
    const raw = req.headers['x-business-id'];
    const bid = Array.isArray(raw) ? raw[0] : raw;
    if (!bid || typeof bid !== 'string') {
      throw new BadRequestException('Selecione um estabelecimento antes de continuar.');
    }
    const business = await this.businesses.findOne({ where: { id: bid.trim() } });
    if (
      !business?.isActive ||
      business.moderationStatus !== 'approved'
    ) {
      throw new NotFoundException(
        'Negócio não encontrado, inativo ou aguardando aprovação da plataforma',
      );
    }
    if (business.tenantId !== ctx.tenantId) {
      throw new ForbiddenException('Negócio não pertence ao município do token');
    }
    const member = await this.members.findOne({
      where: { userId: ctx.user.id, businessId: business.id },
    });
    if (!member) {
      throw new ForbiddenException('Sem permissão para este negócio');
    }
    req.erpBusiness = business;
    req.erpBusinessRole = member.role;
    return true;
  }
}

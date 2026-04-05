import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { ErpBusiness } from '../../entities/erp-business.entity';

/** Negócio validado por `ErpBusinessGuard` (header X-Business-Id). */
export const SelectedBusiness = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ErpBusiness => {
    const req = ctx.switchToHttp().getRequest();
    const b = req.erpBusiness as ErpBusiness | undefined;
    if (!b) {
      throw new InternalServerErrorException('ErpBusinessGuard ausente na rota');
    }
    return b;
  },
);

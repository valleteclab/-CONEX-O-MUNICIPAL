import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthUserContext, isAuthUserContext } from '../../auth/auth-user-context';

export const CurrentTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const u = ctx.switchToHttp().getRequest().user;
    if (isAuthUserContext(u)) {
      return u.tenantId;
    }
    throw new UnauthorizedException('Contexto de tenant ausente');
  },
);

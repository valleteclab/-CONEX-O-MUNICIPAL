import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserContext, isAuthUserContext } from '../../auth/auth-user-context';
import { User } from '../../entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const req = ctx.switchToHttp().getRequest();
    const u = req.user as User | AuthUserContext;
    if (isAuthUserContext(u)) {
      return u.user;
    }
    return u;
  },
);

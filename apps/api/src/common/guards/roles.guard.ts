import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUserContext, isAuthUserContext } from '../../auth/auth-user-context';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUserContext | undefined;
    if (!user || !isAuthUserContext(user)) {
      return false;
    }

    const globalRole = user.user.role;
    const tenantRole = user.tenantRole;

    return requiredRoles.some((role) => role === globalRole || role === tenantRole);
  }
}

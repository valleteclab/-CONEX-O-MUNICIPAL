import { User } from '../entities/user.entity';

/** Valor anexado a `request.user` após JwtStrategy.validate (multitenant). */
export type AuthUserContext = { user: User; tenantId: string };

export function isAuthUserContext(
  u: User | AuthUserContext,
): u is AuthUserContext {
  return (
    typeof u === 'object' &&
    u !== null &&
    'user' in u &&
    'tenantId' in u
  );
}

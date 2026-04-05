import { User } from '../entities/user.entity';

export type AuthUserContext = { user: User; tenantId: string; tenantRole: string };

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

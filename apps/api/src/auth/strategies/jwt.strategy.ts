import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthUserContext } from '../auth-user-context';
import { User } from '../../entities/user.entity';
import { UserTenant } from '../../entities/user-tenant.entity';

export type JwtPayload = { sub: string; email: string; tid: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserTenant)
    private readonly userTenants: Repository<UserTenant>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUserContext> {
    if (!payload?.tid) {
      throw new UnauthorizedException();
    }
    const user = await this.users.findOne({
      where: { id: payload.sub, isActive: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const membership = await this.userTenants.findOne({
      where: {
        userId: user.id,
        tenantId: payload.tid,
        isActive: true,
      },
    });
    if (!membership) {
      throw new UnauthorizedException();
    }
    return { user, tenantId: payload.tid };
  }
}

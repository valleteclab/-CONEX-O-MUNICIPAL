import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { JwtPayload } from './strategies/jwt.strategy';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserPublicDto } from './dto/user-public.dto';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(UserTenant)
    private readonly userTenants: Repository<UserTenant>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResets: Repository<PasswordResetToken>,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      throw new BadRequestException('É necessário aceitar os termos e a LGPD');
    }
    const slug = this.config.get<string>('tenant.defaultSlug', {
      infer: true,
    })!;
    const tenant = await this.tenants.findOne({ where: { slug } });
    if (!tenant) {
      throw new BadRequestException(
        `Tenant padrão não encontrado: ${slug}. Rode o seed SQL (infra/docker/init.sql).`,
      );
    }
    const count = await this.users.count({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (count > 0) {
      throw new BadRequestException('E-mail já cadastrado');
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({
      email: dto.email.toLowerCase().trim(),
      fullName: dto.fullName.trim(),
      phone: dto.phone?.trim() || null,
      passwordHash,
      role: dto.role,
    });
    await this.users.save(user);
    const ut = this.userTenants.create({
      userId: user.id,
      tenantId: tenant.id,
      role: dto.role,
      isActive: true,
    });
    await this.userTenants.save(ut);
    return this.issueTokens(user, tenant.id);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    user.lastLogin = new Date();
    await this.users.save(user);
    const tenantId = await this.resolveTenantIdForUser(user.id);
    if (!tenantId) {
      throw new BadRequestException(
        'Usuário sem vínculo ativo a um município (tenant). Contate o suporte.',
      );
    }
    return this.issueTokens(user, tenantId);
  }

  async refresh(refreshTokenRaw: string) {
    const row = await this.refreshTokens.findOne({
      where: { token: refreshTokenRaw },
      relations: ['user'],
    });
    if (!row || row.expiresAt < new Date() || !row.user?.isActive) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
    await this.refreshTokens.delete({ id: row.id });
    const tenantId = await this.resolveTenantIdForUser(row.user.id);
    if (!tenantId) {
      throw new UnauthorizedException();
    }
    return this.issueTokens(row.user, tenantId);
  }

  async logout(refreshTokenRaw: string) {
    await this.refreshTokens.delete({ token: refreshTokenRaw });
    return { ok: true };
  }

  me(user: User, tenantId: string) {
    return UserPublicDto.fromUser(
      {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      tenantId,
    );
  }

  /**
   * Resposta uniforme (LGPD): não revela se o e-mail existe.
   * Em desenvolvimento, loga o token em stderr para testes sem SMTP.
   */
  async forgotPassword(emailRaw: string) {
    const email = emailRaw.toLowerCase().trim();
    const user = await this.users.findOne({ where: { email } });
    const generic = {
      message:
        'Se o e-mail estiver cadastrado, enviaremos instruções para redefinição.',
    };
    if (!user?.isActive) {
      return generic;
    }
    await this.passwordResets.delete({ userId: user.id });
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = sha256Hex(rawToken);
    const minutes =
      this.config.get<number>('auth.passwordResetExpiresMinutes', {
        infer: true,
      }) ?? 60;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
    await this.passwordResets.save(
      this.passwordResets.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      }),
    );
    if (this.config.get<string>('nodeEnv') !== 'production') {
      console.error(
        `[api] password reset (dev) email=${email} token=${rawToken} expira_em_min=${minutes}`,
      );
    }
    return generic;
  }

  async resetPassword(tokenRaw: string, newPassword: string) {
    if (newPassword.length < 8) {
      throw new BadRequestException('Senha deve ter no mínimo 8 caracteres');
    }
    const tokenHash = sha256Hex(tokenRaw.trim());
    const row = await this.passwordResets.findOne({
      where: { tokenHash },
      relations: ['user'],
    });
    if (
      !row ||
      row.expiresAt < new Date() ||
      !row.user?.isActive
    ) {
      throw new BadRequestException('Token inválido ou expirado');
    }
    row.user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.save(row.user);
    await this.passwordResets.delete({ id: row.id });
    await this.refreshTokens.delete({ userId: row.user.id });
    return { ok: true, message: 'Senha alterada. Faça login novamente.' };
  }

  private async resolveTenantIdForUser(userId: string): Promise<string | null> {
    const defaultSlug = this.config.get<string>('tenant.defaultSlug', {
      infer: true,
    })!;
    const rows = await this.userTenants.find({
      where: { userId, isActive: true },
      relations: ['tenant'],
      order: { joinedAt: 'ASC' },
    });
    if (rows.length === 0) {
      return null;
    }
    const bySlug = rows.find((r) => r.tenant?.slug === defaultSlug);
    return (bySlug ?? rows[0]).tenantId;
  }

  private async issueTokens(user: User, tenantId: string) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tid: tenantId,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const days =
      this.config.get<number>('auth.refreshExpiresDays', { infer: true }) ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId: user.id,
        token: refreshToken,
        expiresAt,
      }),
    );
    return {
      accessToken,
      refreshToken,
      expiresIn:
        this.config.get<string>('auth.accessExpires', { infer: true }) ?? '15m',
      tenantId,
      user: UserPublicDto.fromUser(
        {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        tenantId,
      ),
    };
  }
}

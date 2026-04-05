import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { Tenant } from '../entities/tenant.entity';
import { User } from '../entities/user.entity';
import { UserTenant } from '../entities/user-tenant.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserPublicDto } from './dto/user-public.dto';
import { JwtPayload } from './strategies/jwt.strategy';

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
    return this.issueTokens(user);
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
    return this.issueTokens(user);
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
    return this.issueTokens(row.user);
  }

  async logout(refreshTokenRaw: string) {
    await this.refreshTokens.delete({ token: refreshTokenRaw });
    return { ok: true };
  }

  me(user: User) {
    return UserPublicDto.fromUser({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      emailVerified: user.emailVerified,
    });
  }

  private async issueTokens(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(48).toString('hex');
    const days = this.config.get<number>('auth.refreshExpiresDays', { infer: true }) ?? 7;
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
      expiresIn: this.config.get<string>('auth.accessExpires', { infer: true }) ?? '15m',
      user: UserPublicDto.fromUser({
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
      }),
    };
  }
}

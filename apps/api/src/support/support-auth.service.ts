import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export type SupportJwtPayload = {
  sub: string;
  scope: 'support';
};

export type SupportSession = {
  username: string;
  displayName: string;
};

@Injectable()
export class SupportAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string, password: string): Promise<{
    token: string;
    expiresIn: string;
    session: SupportSession;
  }> {
    const expectedUsername = this.config.get<string>('support.adminUsername', '');
    const expectedPassword = this.config.get<string>('support.adminPassword', '');

    if (!expectedUsername || !expectedPassword) {
      throw new ServiceUnavailableException(
        'Central de suporte indisponivel: configure SUPPORT_ADMIN_USERNAME e SUPPORT_ADMIN_PASSWORD.',
      );
    }

    if (
      username.trim() !== expectedUsername.trim() ||
      password !== expectedPassword
    ) {
      throw new UnauthorizedException('Credenciais de suporte invalidas');
    }

    const token = await this.jwt.signAsync(
      {
        sub: expectedUsername.trim(),
        scope: 'support',
      } satisfies SupportJwtPayload,
      {
        secret: this.config.getOrThrow<string>('support.sessionSecret'),
        expiresIn: this.config.get<string>('support.sessionExpires', '8h'),
      },
    );

    return {
      token,
      expiresIn: this.config.get<string>('support.sessionExpires', '8h'),
      session: this.buildSession(expectedUsername),
    };
  }

  async verifyToken(token: string): Promise<SupportSession> {
    const payload = await this.jwt.verifyAsync<SupportJwtPayload>(token, {
      secret: this.config.getOrThrow<string>('support.sessionSecret'),
    });

    if (payload.scope !== 'support' || !payload.sub?.trim()) {
      throw new UnauthorizedException('Sessao de suporte invalida');
    }

    const expectedUsername = this.config.get<string>('support.adminUsername', '');
    if (!expectedUsername || payload.sub.trim() !== expectedUsername.trim()) {
      throw new UnauthorizedException('Sessao de suporte nao autorizada');
    }

    return this.buildSession(payload.sub);
  }

  me(token: string): Promise<SupportSession> {
    return this.verifyToken(token);
  }

  private buildSession(username: string): SupportSession {
    return {
      username: username.trim(),
      displayName: 'Central de suporte tecnico',
    };
  }
}

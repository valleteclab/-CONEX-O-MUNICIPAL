import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupportAuthService } from '../support-auth.service';

@Injectable()
export class SupportAuthGuard implements CanActivate {
  constructor(private readonly supportAuth: SupportAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';

    if (!token) {
      throw new UnauthorizedException('Sessao de suporte ausente');
    }

    request.supportUser = await this.supportAuth.verifyToken(token);
    return true;
  }
}

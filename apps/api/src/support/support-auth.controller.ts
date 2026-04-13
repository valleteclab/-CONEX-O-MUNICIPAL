import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupportLoginDto } from './dto/support-login.dto';
import { SupportAuthGuard } from './guards/support-auth.guard';
import { SupportAuthService } from './support-auth.service';

@ApiTags('support-auth')
@Controller('support-auth')
export class SupportAuthController {
  constructor(private readonly supportAuth: SupportAuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login isolado da central de suporte' })
  login(@Body() dto: SupportLoginDto) {
    return this.supportAuth.login(dto.username, dto.password);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout local da central de suporte' })
  logout() {
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SupportAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sessao atual da central de suporte' })
  me(@Req() req: { supportUser: unknown }) {
    return req.supportUser;
  }
}

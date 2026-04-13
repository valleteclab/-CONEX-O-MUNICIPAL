import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateErpProductClassifierSettingDto } from '../platform/dto/update-erp-product-classifier-setting.dto';
import { SupportAuthGuard } from './guards/support-auth.guard';
import { SupportService } from './support.service';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(SupportAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard operacional da central de suporte' })
  dashboard() {
    return this.support.getDashboard();
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Listar status das integracoes monitoradas' })
  integrations() {
    return this.support.listIntegrations();
  }

  @Get('integrations/:key')
  @ApiOperation({ summary: 'Detalhe de uma integracao monitorada' })
  integration(@Param('key') key: string) {
    return this.support.getIntegration(key);
  }

  @Post('integrations/:key/test')
  @ApiOperation({ summary: 'Executar teste de conectividade/saude da integracao' })
  testIntegration(@Param('key') key: string) {
    return this.support.testIntegration(key);
  }

  @Get('ai-settings')
  @ApiOperation({ summary: 'Ler configuracao operacional da IA' })
  aiSettings() {
    return this.support.getAiSettings();
  }

  @Patch('ai-settings')
  @ApiOperation({ summary: 'Atualizar configuracao operacional da IA' })
  patchAiSettings(@Body() dto: UpdateErpProductClassifierSettingDto) {
    return this.support.patchAiSettings(dto);
  }
}

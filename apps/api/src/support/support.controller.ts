import { Body, Controller, Get, Param, Patch, Post, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateErpProductClassifierSettingDto } from '../platform/dto/update-erp-product-classifier-setting.dto';
import { UpdateSupportUserDto } from './dto/update-support-user.dto';
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

  @Get('fiscal-provider')
  @ApiOperation({ summary: 'Ler provedor fiscal ativo e status de configuracao' })
  getFiscalProvider() {
    return this.support.getFiscalProviderConfig();
  }

  @Patch('fiscal-provider')
  @ApiOperation({ summary: 'Alterar provedor fiscal ativo do sistema' })
  setFiscalProvider(@Body() body: { provider: string }) {
    if (body.provider !== 'plugnotas' && body.provider !== 'spedy') {
      throw new BadRequestException('Provedor deve ser "plugnotas" ou "spedy".');
    }
    return this.support.setFiscalProvider(body.provider as 'plugnotas' | 'spedy');
  }

  @Get('ai-settings')
  @ApiOperation({ summary: 'Ler configuracao operacional da IA' })
  aiSettings() {
    return this.support.getAiSettings();
  }

  @Get('ai-models')
  @ApiOperation({ summary: 'Listar modelos disponiveis do OpenRouter' })
  aiModels() {
    return this.support.listAiModels();
  }

  @Patch('ai-settings')
  @ApiOperation({ summary: 'Atualizar configuracao operacional da IA' })
  patchAiSettings(@Body() dto: UpdateErpProductClassifierSettingDto) {
    return this.support.patchAiSettings(dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios do sistema para suporte tecnico' })
  users() {
    return this.support.listUsers();
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Atualizar dados e senha de um usuario do sistema' })
  patchUser(@Param('id') id: string, @Body() dto: UpdateSupportUserDto) {
    return this.support.updateUser(id, dto);
  }
}

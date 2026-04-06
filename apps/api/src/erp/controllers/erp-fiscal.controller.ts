import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ErpBusinessGuard } from '../guards/erp-business.guard';
import { SelectedBusiness } from '../decorators/selected-business.decorator';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpFiscalService } from '../services/erp-fiscal.service';
import { EmitFiscalDto } from '../dto/fiscal.dto';

@ApiTags('erp — fiscal')
@Controller('erp/fiscal')
export class ErpFiscalController {
  constructor(private readonly svc: ErpFiscalService) {}

  // ─── Webhook — sem autenticação ─────────────────────────────────────
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook PlugNotas (atualização de status)' })
  async webhook(@Body() payload: Record<string, unknown>) {
    await this.svc.handleWebhook(payload);
    return { ok: true };
  }

  // ─── Rotas autenticadas ──────────────────────────────────────────────
  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Get()
  @ApiOperation({ summary: 'Listar documentos fiscais emitidos' })
  list(
    @SelectedBusiness() business: ErpBusiness,
    @Query('take') takeStr?: string,
    @Query('skip') skipStr?: string,
  ) {
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    return this.svc.list(business, take, skip);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Get('readiness')
  @ApiOperation({
    summary:
      'Checklist de dados do emitente para NFS-e ou NF-e (query type=nfse|nfe)',
  })
  readiness(
    @SelectedBusiness() business: ErpBusiness,
    @Query('type') typeStr?: string,
  ) {
    const type = typeStr === 'nfe' ? 'nfe' : 'nfse';
    return this.svc.getEmitReadiness(business, type);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Post('emit')
  @ApiOperation({ summary: 'Emitir nota fiscal a partir de pedido confirmado' })
  emit(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: EmitFiscalDto,
  ) {
    return this.svc.emitFromOrder(business, dto);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Post('register-emitente')
  @ApiOperation({
    summary:
      'Cadastrar emitente no PlugNotas (POST /empresa na API deles). Query force=true reenvia.',
  })
  registerEmitente(
    @SelectedBusiness() business: ErpBusiness,
    @Query('force') forceStr?: string,
  ) {
    const force = forceStr === 'true' || forceStr === '1';
    return this.svc.registerEmitentePlugnotas(business, { force });
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do documento fiscal' })
  findOne(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(business, id);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Patch(':id/refresh')
  @ApiOperation({ summary: 'Atualizar status consultando o PlugNotas' })
  refreshStatus(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.refreshStatus(business, id);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar documento fiscal autorizado' })
  cancel(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.cancel(business, id);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ErpBusinessGuard } from '../guards/erp-business.guard';
import { SelectedBusiness } from '../decorators/selected-business.decorator';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpFiscalService } from '../services/erp-fiscal.service';
import {
  CancelFiscalDocumentDto,
  CreateFiscalReturnDto,
  EmitFiscalDto,
  SendCceDto,
} from '../dto/fiscal.dto';

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
  @Get('provider')
  @ApiOperation({ summary: 'Retorna o nome do provedor fiscal ativo no sistema' })
  getActiveProvider() {
    return this.svc.getActiveFiscalProvider();
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Get('readiness')
  @ApiOperation({
    summary:
      'Checklist de dados do emitente para NFS-e, NF-e ou NFC-e (query type=nfse|nfe|nfce)',
  })
  readiness(
    @SelectedBusiness() business: ErpBusiness,
    @Query('type') typeStr?: string,
    @Query('orderId') orderId?: string,
  ) {
    const type =
      typeStr === 'nfe' ? 'nfe' : typeStr === 'nfce' ? 'nfce' : 'nfse';
    return this.svc.getEmitReadiness(business, type, orderId);
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
  @Post('certificate')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'password'],
      properties: {
        file: { type: 'string', format: 'binary' },
        password: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiOperation({
    summary:
      'Enviar certificado A1 (.pfx/.p12) para o PlugNotas e sincronizar o emitente',
  })
  uploadCertificate(
    @SelectedBusiness() business: ErpBusiness,
    @UploadedFile()
    file?: {
      originalname: string;
      mimetype: string;
      buffer: Buffer;
      size: number;
    },
    @Body('password') password?: string,
    @Body('email') email?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo do certificado nao enviado');
    }
    return this.svc.uploadCertificate(business, {
      password: password ?? '',
      email,
      filename: file.originalname,
      contentType: file.mimetype,
      buffer: file.buffer,
    });
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
  @Post('register-spedy')
  @ApiOperation({
    summary: 'Registrar emitente na Spedy (POST /v1/companies)',
  })
  registerSpedy(@SelectedBusiness() business: ErpBusiness) {
    return this.svc.registerEmitenteSpedy(business);
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
  @Get('sales-orders/:salesOrderId/original')
  @ApiOperation({ summary: 'Buscar documento fiscal original ativo da venda' })
  async findOriginalBySalesOrder(
    @SelectedBusiness() business: ErpBusiness,
    @Param('salesOrderId', ParseUUIDPipe) salesOrderId: string,
  ) {
    const doc = await this.svc.findActiveSalesDocument(business, salesOrderId);
    if (!doc) {
      throw new BadRequestException('Nenhum documento fiscal ativo encontrado para esta venda.');
    }
    return doc;
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Post('returns')
  @ApiOperation({ summary: 'Emitir nota fiscal de devolucao a partir de venda autorizada' })
  createReturn(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateFiscalReturnDto,
  ) {
    return this.svc.createReturnFromOrder(business, dto);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Get('returns/:id')
  @ApiOperation({ summary: 'Detalhar devolucao fiscal' })
  getReturn(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(business, id);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Post(':id/cce')
  @ApiOperation({
    summary: 'Enviar Carta de Correção Eletrônica (CC-e) — exclusivo NF-e autorizada',
  })
  sendCce(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendCceDto,
  ) {
    return this.svc.sendCce(business, id, dto);
  }

  @UseGuards(JwtAuthGuard, ErpBusinessGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'X-Business-Id', required: true })
  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar documento fiscal autorizado' })
  cancel(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelFiscalDocumentDto,
  ) {
    return this.svc.cancel(business, id, dto);
  }
}

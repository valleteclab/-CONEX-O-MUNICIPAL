import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { SelectedBusiness } from '../decorators/selected-business.decorator';
import { CreateQuoteDto, PatchQuoteStatusDto } from '../dto/quote.dto';
import { ErpBusinessGuard } from '../guards/erp-business.guard';
import { ErpQuoteService } from '../services/erp-quote.service';

@ApiTags('erp — orçamentos')
@Controller('erp/quotes')
@UseGuards(JwtAuthGuard, ErpBusinessGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Business-Id', required: true })
export class ErpQuotesController {
  constructor(private readonly svc: ErpQuoteService) {}

  @Get()
  @ApiOperation({ summary: 'Listar orçamentos' })
  list(
    @SelectedBusiness() business: ErpBusiness,
    @Query('take') takeStr?: string,
    @Query('skip') skipStr?: string,
  ) {
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    return this.svc.list(business, take, skip);
  }

  @Post()
  @ApiOperation({ summary: 'Criar orçamento' })
  create(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.svc.create(business, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar orçamento' })
  findOne(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(business, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status do orçamento' })
  patchStatus(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchQuoteStatusDto,
  ) {
    return this.svc.patchStatus(business, id, dto);
  }

  @Post(':id/convert-sales-order')
  @ApiOperation({ summary: 'Converter orçamento em pedido de venda' })
  convertToSalesOrder(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.convertToSalesOrder(business, id);
  }

  @Post(':id/convert-service-order')
  @ApiOperation({ summary: 'Converter orçamento em ordem de serviço' })
  convertToServiceOrder(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.convertToServiceOrder(business, id);
  }
}

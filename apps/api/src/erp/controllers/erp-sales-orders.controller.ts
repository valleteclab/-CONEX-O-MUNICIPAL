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
import { ErpBusinessGuard } from '../guards/erp-business.guard';
import { SelectedBusiness } from '../decorators/selected-business.decorator';
import { ErpBusiness } from '../../entities/erp-business.entity';
import {
  CreateSalesOrderDto,
  PatchSalesOrderStatusDto,
} from '../dto/sales-order.dto';
import { ErpSalesOrderService } from '../services/erp-sales-order.service';

@ApiTags('erp — pedidos de venda')
@Controller('erp/sales-orders')
@UseGuards(JwtAuthGuard, ErpBusinessGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Business-Id', required: true })
export class ErpSalesOrdersController {
  constructor(private readonly svc: ErpSalesOrderService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos de venda' })
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
  @ApiOperation({ summary: 'Criar pedido (rascunho) com itens' })
  create(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateSalesOrderDto,
  ) {
    return this.svc.create(business, dto, {
      source: dto.source,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe com itens' })
  findOne(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(business, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status (confirmar / cancelar)' })
  patchStatus(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchSalesOrderStatusDto,
  ) {
    return this.svc.patchStatus(business, id, dto);
  }
}

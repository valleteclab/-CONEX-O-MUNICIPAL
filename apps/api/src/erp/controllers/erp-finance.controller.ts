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
  CreateAccountPayableDto,
  CreateAccountReceivableDto,
  CreateCashEntryDto,
  FinanceSummaryQueryDto,
  PatchFinanceStatusDto,
} from '../dto/finance.dto';
import { ErpFinanceService } from '../services/erp-finance.service';

@ApiTags('erp — financeiro')
@Controller('erp/finance')
@UseGuards(JwtAuthGuard, ErpBusinessGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Business-Id', required: true })
export class ErpFinanceController {
  constructor(private readonly svc: ErpFinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro do período' })
  summary(
    @SelectedBusiness() business: ErpBusiness,
    @Query() query: FinanceSummaryQueryDto,
  ) {
    return this.svc.summary(business, query);
  }

  @Get('ar')
  @ApiOperation({ summary: 'Contas a receber' })
  listAr(
    @SelectedBusiness() business: ErpBusiness,
    @Query('take') takeStr?: string,
    @Query('skip') skipStr?: string,
  ) {
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    return this.svc.listAr(business, take, skip);
  }

  @Post('ar')
  @ApiOperation({ summary: 'Lançar conta a receber' })
  createAr(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateAccountReceivableDto,
  ) {
    return this.svc.createAr(business, dto);
  }

  @Patch('ar/:id/status')
  @ApiOperation({ summary: 'Atualizar status (pago / cancelado)' })
  patchAr(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchFinanceStatusDto,
  ) {
    return this.svc.patchArStatus(business, id, dto);
  }

  @Get('ap')
  @ApiOperation({ summary: 'Contas a pagar' })
  listAp(
    @SelectedBusiness() business: ErpBusiness,
    @Query('take') takeStr?: string,
    @Query('skip') skipStr?: string,
  ) {
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    return this.svc.listAp(business, take, skip);
  }

  @Post('ap')
  @ApiOperation({ summary: 'Lançar conta a pagar' })
  createAp(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateAccountPayableDto,
  ) {
    return this.svc.createAp(business, dto);
  }

  @Patch('ap/:id/status')
  @ApiOperation({ summary: 'Atualizar status' })
  patchAp(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchFinanceStatusDto,
  ) {
    return this.svc.patchApStatus(business, id, dto);
  }

  @Get('cash')
  @ApiOperation({ summary: 'Fluxo de caixa (lançamentos)' })
  listCash(
    @SelectedBusiness() business: ErpBusiness,
    @Query('take') takeStr?: string,
    @Query('skip') skipStr?: string,
  ) {
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    return this.svc.listCash(business, take, skip);
  }

  @Post('cash')
  @ApiOperation({ summary: 'Lançamento de caixa (entrada/saída)' })
  createCash(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateCashEntryDto,
  ) {
    return this.svc.createCash(business, dto);
  }
}

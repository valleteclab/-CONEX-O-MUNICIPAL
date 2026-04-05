import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ErpBusinessGuard } from '../guards/erp-business.guard';
import { SelectedBusiness } from '../decorators/selected-business.decorator';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { CreateErpPartyDto, UpdateErpPartyDto } from '../dto/party.dto';
import { ErpPartyService } from '../services/erp-party.service';

@ApiTags('erp — clientes/fornecedores')
@Controller('erp/parties')
@UseGuards(JwtAuthGuard, ErpBusinessGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Business-Id', required: true })
export class ErpPartiesController {
  constructor(private readonly svc: ErpPartyService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes/fornecedores' })
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
  @ApiOperation({ summary: 'Cadastrar cliente ou fornecedor' })
  create(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateErpPartyDto,
  ) {
    return this.svc.create(business, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe' })
  findOne(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(business, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar' })
  update(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateErpPartyDto,
  ) {
    return this.svc.update(business, id, dto);
  }
}

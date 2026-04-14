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
import { User } from '../../entities/user.entity';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SelectedBusiness } from '../decorators/selected-business.decorator';
import {
  CreateServiceOrderDto,
  PatchServiceOrderStatusDto,
} from '../dto/service-order.dto';
import { ErpBusinessGuard } from '../guards/erp-business.guard';
import { ErpServiceOrderService } from '../services/erp-service-order.service';

@ApiTags('erp — ordens de serviço')
@Controller('erp/service-orders')
@UseGuards(JwtAuthGuard, ErpBusinessGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Business-Id', required: true })
export class ErpServiceOrdersController {
  constructor(private readonly svc: ErpServiceOrderService) {}

  @Get()
  @ApiOperation({ summary: 'Listar ordens de serviço' })
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
  @ApiOperation({ summary: 'Criar ordem de serviço' })
  create(
    @CurrentUser() user: User,
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateServiceOrderDto,
  ) {
    return this.svc.create(business, dto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhar ordem de serviço' })
  findOne(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(business, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status da ordem de serviço' })
  patchStatus(
    @CurrentUser() user: User,
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchServiceOrderStatusDto,
  ) {
    return this.svc.patchStatus(business, id, dto, user.id);
  }
}

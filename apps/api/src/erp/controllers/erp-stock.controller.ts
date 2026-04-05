import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ErpBusinessGuard } from '../guards/erp-business.guard';
import { SelectedBusiness } from '../decorators/selected-business.decorator';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { CreateStockLocationDto, CreateStockMovementDto } from '../dto/stock.dto';
import { ErpStockService } from '../services/erp-stock.service';

@ApiTags('erp — estoque')
@Controller('erp/stock')
@UseGuards(JwtAuthGuard, ErpBusinessGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Business-Id', required: true })
export class ErpStockController {
  constructor(private readonly svc: ErpStockService) {}

  @Get('locations')
  @ApiOperation({ summary: 'Locais de estoque' })
  locations(@SelectedBusiness() business: ErpBusiness) {
    return this.svc.listLocations(business);
  }

  @Post('locations')
  @ApiOperation({ summary: 'Criar local' })
  createLocation(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateStockLocationDto,
  ) {
    return this.svc.createLocation(business, dto);
  }

  @Get('balances')
  @ApiOperation({ summary: 'Saldos por produto/local' })
  balances(
    @SelectedBusiness() business: ErpBusiness,
    @Query('locationId') locationId?: string,
  ) {
    return this.svc.listBalances(business, locationId);
  }

  @Get('movements')
  @ApiOperation({ summary: 'Histórico de movimentações' })
  movements(
    @SelectedBusiness() business: ErpBusiness,
    @Query('take') takeStr?: string,
    @Query('skip') skipStr?: string,
  ) {
    const take = Math.min(100, Math.max(1, parseInt(takeStr ?? '50', 10) || 50));
    const skip = Math.max(0, parseInt(skipStr ?? '0', 10) || 0);
    return this.svc.listMovements(business, take, skip);
  }

  @Post('movements')
  @ApiOperation({ summary: 'Registrar movimentação (atualiza saldo)' })
  createMovement(
    @SelectedBusiness() business: ErpBusiness,
    @CurrentUser() user: User,
    @Body() dto: CreateStockMovementDto,
  ) {
    return this.svc.createMovement(business, user.id, dto);
  }
}

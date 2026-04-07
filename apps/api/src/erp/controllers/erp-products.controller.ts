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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { CreateErpProductDto, UpdateErpProductDto } from '../dto/product.dto';
import { CreateProductClassificationJobDto } from '../dto/product-classification-job.dto';
import { ErpProductService } from '../services/erp-product.service';

@ApiTags('erp — produtos')
@Controller('erp/products')
@UseGuards(JwtAuthGuard, ErpBusinessGuard)
@ApiBearerAuth()
@ApiHeader({ name: 'X-Business-Id', required: true })
export class ErpProductsController {
  constructor(private readonly svc: ErpProductService) {}

  @Get()
  @ApiOperation({ summary: 'Listar produtos (requer X-Business-Id)' })
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
  @ApiOperation({ summary: 'Criar produto' })
  create(
    @SelectedBusiness() business: ErpBusiness,
    @Body() dto: CreateErpProductDto,
  ) {
    return this.svc.create(business, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter produto' })
  findOne(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(business, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  update(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateErpProductDto,
  ) {
    return this.svc.update(business, id, dto);
  }

  @Post('classification-jobs')
  @ApiOperation({ summary: 'Criar job assíncrono de classificação fiscal (IA)' })
  createClassificationJob(
    @SelectedBusiness() business: ErpBusiness,
    @CurrentUser() user: User,
    @Body() dto: CreateProductClassificationJobDto,
  ) {
    return this.svc.createClassificationJob({
      business,
      requestedByUserId: user.id,
      filter: {
        onlyMissingNcm: dto.onlyMissingNcm ?? true,
        productIds: dto.productIds ?? null,
      },
      limit: dto.limit ?? 50,
    });
  }

  @Get('classification-jobs/:id')
  @ApiOperation({ summary: 'Consultar status/resultado do job de classificação fiscal (IA)' })
  getClassificationJob(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.getClassificationJob(business, id);
  }

  @Post('classification-jobs/:id/apply')
  @ApiOperation({ summary: 'Aplicar resultado do job no cadastro (preenche NCM/CFOP/origem)' })
  applyClassificationJob(
    @SelectedBusiness() business: ErpBusiness,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.applyClassificationJob(business, id);
  }
}

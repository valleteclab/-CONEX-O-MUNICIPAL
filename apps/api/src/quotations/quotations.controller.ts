import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { CreateQuotationResponseDto } from './dto/create-quotation-response.dto';
import { ListQuotationQueryDto } from './dto/list-quotation-query.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('cotações')
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar minhas solicitações (autenticado, tenant ativo no JWT)',
  })
  async listMine(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Query() query: ListQuotationQueryDto,
  ) {
    return this.quotations.listMine(user.id, tenantId, query);
  }

  @Get()
  @ApiOperation({ summary: 'Listar oportunidades abertas (público, por tenant)' })
  async list(@Query() query: ListQuotationQueryDto) {
    const tenantId = await this.quotations.resolveTenantId(query.tenant);
    return this.quotations.listPublic(tenantId, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar oportunidade / solicitação autenticada' })
  async create(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotations.create(user, tenantId, dto);
  }

  @Post(':id/responses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Responder oportunidade / cotação' })
  async createResponse(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuotationResponseDto,
  ) {
    return this.quotations.createResponse(user, tenantId, id, dto);
  }
}

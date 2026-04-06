import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateErpBusinessDto } from '../dto/create-business.dto';
import { UpdateErpBusinessProfileDto } from '../dto/update-erp-business-profile.dto';
import { ErpBusinessService } from '../services/erp-business.service';

@ApiTags('erp — negócios')
@Controller('erp/businesses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ErpBusinessController {
  constructor(private readonly svc: ErpBusinessService) {}

  @Get()
  @ApiOperation({ summary: 'Listar negócios do usuário no tenant (município)' })
  list(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
  ) {
    return this.svc.listForUser(user.id, tenantId);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar negócio (MEI/empresa) e vínculo como empresa_owner + depósito padrão',
  })
  create(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateErpBusinessDto,
  ) {
    return this.svc.create(user.id, tenantId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe do negócio (incl. campos fiscais) para o usuário vinculado',
  })
  findOne(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOneForUser(user.id, tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar dados cadastrais e fiscais do emitente (CNPJ, endereço, IM/IE, IBGE, config NFS-e)',
  })
  updateProfile(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateErpBusinessProfileDto,
  ) {
    return this.svc.updateProfile(user.id, tenantId, id, dto);
  }
}

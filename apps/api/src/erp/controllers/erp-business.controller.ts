import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenantId } from '../../common/decorators/current-tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateErpBusinessDto } from '../dto/create-business.dto';
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
}

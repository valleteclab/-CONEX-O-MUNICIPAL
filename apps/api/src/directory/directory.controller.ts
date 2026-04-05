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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenantId } from '../common/decorators/current-tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DirectoryService } from './directory.service';
import { CreateDirectoryListingDto } from './dto/create-directory-listing.dto';
import { ListDirectoryQueryDto } from './dto/list-directory-query.dto';
import { UpdateDirectoryListingDto } from './dto/update-directory-listing.dto';

@ApiTags('diretório — negócios')
@Controller('businesses')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar negócios publicados (tenant via query ou default)',
  })
  async list(@Query() query: ListDirectoryQueryDto) {
    const tenantId = await this.directory.resolveTenantId(query.tenant);
    return this.directory.listPublic(tenantId, query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Detalhe público por slug' })
  async getBySlug(
    @Param('slug') slug: string,
    @Query('tenant') tenantSlug?: string,
  ) {
    const tenantId = await this.directory.resolveTenantId(tenantSlug);
    return this.directory.findBySlugPublic(tenantId, slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Criar vitrine (MEI/Empresa; vínculo com tenant do JWT)',
  })
  async create(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Body() dto: CreateDirectoryListingDto,
  ) {
    return this.directory.create(user, tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar vitrine (dono ou gestor)' })
  async update(
    @CurrentUser() user: User,
    @CurrentTenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDirectoryListingDto,
  ) {
    return this.directory.updateMine(user, tenantId, id, dto);
  }
}

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

  @Get('featured')
  @ApiOperation({ summary: 'Listar negócios em destaque' })
  async featured(
    @Query('tenant') tenantSlug?: string,
    @Query('take') takeStr?: string,
  ) {
    const tenantId = await this.directory.resolveTenantId(tenantSlug);
    const take = Math.min(12, Math.max(1, parseInt(takeStr ?? '6', 10) || 6));
    return this.directory.listFeatured(tenantId, take);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias do diretório' })
  async categories(@Query('tenant') tenantSlug?: string) {
    const tenantId = await this.directory.resolveTenantId(tenantSlug);
    return this.directory.listCategories(tenantId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar negócios publicados' })
  async search(@Query() query: ListDirectoryQueryDto) {
    const tenantId = await this.directory.resolveTenantId(query.tenant);
    return this.directory.search(tenantId, query);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar negócios publicados (tenant via query ou default)',
  })
  async list(@Query() query: ListDirectoryQueryDto) {
    const tenantId = await this.directory.resolveTenantId(query.tenant);
    return this.directory.listPublic(tenantId, query);
  }

  @Get('mine/list')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar vitrines do usuário autenticado no tenant ativo' })
  async mine(@CurrentUser() user: User, @CurrentTenantId() tenantId: string) {
    return this.directory.listMine(user, tenantId);
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
